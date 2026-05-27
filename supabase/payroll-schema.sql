-- ==========================================
-- Staff Management PWA — Payroll Schema
-- v1.0 — Attendance-based payroll (Phase 1–3)
-- Run this AFTER schema.sql has been applied.
-- ==========================================

-- ── 1. ADD PAYROLL COLUMNS TO COMPANIES ──────────────────────────────────────

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS daily_rate_method TEXT DEFAULT '26_day';
-- Note: CHECK constraint added separately because ADD COLUMN IF NOT EXISTS
-- does not support inline CHECK in all PostgreSQL versions.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'companies_daily_rate_method_check'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_daily_rate_method_check
      CHECK (daily_rate_method IN ('26_day', '30_day', 'actual'));
  END IF;
END $$;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS work_hours_per_day NUMERIC(4,2) DEFAULT 8;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS late_grace_minutes INT DEFAULT 15;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS late_marks_per_half_day INT DEFAULT 3;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS overtime_multiplier NUMERIC(3,2) DEFAULT 2.0;


-- ── 2. SALARY CONFIGS TABLE ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS salary_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Salary Structure
  monthly_ctc NUMERIC(12,2) NOT NULL,
  basic_pct NUMERIC(5,2) NOT NULL DEFAULT 50,
  hra_pct NUMERIC(5,2) NOT NULL DEFAULT 20,

  -- Optional Bank / ID Info
  bank_account TEXT,
  bank_ifsc TEXT,
  pan TEXT,
  uan TEXT,

  -- Effectivity
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, effective_from)
);

-- Only one active salary config per employee at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_config_one_active
  ON salary_configs(user_id)
  WHERE is_active = true AND effective_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_salary_config_user ON salary_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_config_company ON salary_configs(company_id);


-- ── 3. PAYROLL RUNS TABLE ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Period
  pay_month INT NOT NULL CHECK (pay_month BETWEEN 1 AND 12),
  pay_year INT NOT NULL CHECK (pay_year >= 2024),

  -- Snapshot: salary config at generation time (immutable after creation)
  salary_config_id UUID REFERENCES salary_configs(id),
  snapshot_monthly_ctc NUMERIC(12,2) NOT NULL,
  snapshot_basic_pct NUMERIC(5,2) NOT NULL,
  snapshot_hra_pct NUMERIC(5,2) NOT NULL,
  snapshot_daily_rate_method TEXT NOT NULL,
  snapshot_work_hours_per_day NUMERIC(4,2) NOT NULL,
  snapshot_overtime_multiplier NUMERIC(3,2) NOT NULL,

  -- Attendance Summary
  base_days NUMERIC(4,1) NOT NULL,
  days_present NUMERIC(4,1) NOT NULL,
  half_days NUMERIC(4,1) DEFAULT 0,
  days_absent NUMERIC(4,1) DEFAULT 0,
  late_marks INT DEFAULT 0,
  late_deduction_days NUMERIC(4,1) DEFAULT 0,
  overtime_hours NUMERIC(6,2) DEFAULT 0,

  -- Earnings (full CTC components, before deductions)
  basic_full NUMERIC(12,2) NOT NULL,
  hra_full NUMERIC(12,2) NOT NULL,
  special_full NUMERIC(12,2) NOT NULL,
  overtime_pay NUMERIC(12,2) DEFAULT 0,
  gross_full NUMERIC(12,2) NOT NULL,

  -- Deductions
  lop_deduction NUMERIC(12,2) DEFAULT 0,
  half_day_deduction NUMERIC(12,2) DEFAULT 0,
  late_deduction NUMERIC(12,2) DEFAULT 0,
  other_deductions NUMERIC(12,2) DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL,

  -- Additions
  bonus NUMERIC(12,2) DEFAULT 0,
  total_additions NUMERIC(12,2) DEFAULT 0,

  -- Final
  net_pay NUMERIC(12,2) NOT NULL,

  -- Optional statutory (Phase 4, all default 0)
  pf_employee NUMERIC(12,2) DEFAULT 0,
  pf_employer NUMERIC(12,2) DEFAULT 0,
  esi_employee NUMERIC(12,2) DEFAULT 0,
  esi_employer NUMERIC(12,2) DEFAULT 0,
  professional_tax NUMERIC(12,2) DEFAULT 0,
  tds NUMERIC(12,2) DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'paid')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, pay_month, pay_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_company ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_runs(pay_year, pay_month);
CREATE INDEX IF NOT EXISTS idx_payroll_user ON payroll_runs(user_id);


-- ── 4. SALARY ADJUSTMENTS TABLE ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS salary_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  payroll_run_id UUID REFERENCES payroll_runs(id),

  type TEXT NOT NULL CHECK (type IN (
    'bonus', 'incentive', 'reimbursement',
    'advance_recovery', 'fine', 'other_deduction'
  )),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  pay_month INT NOT NULL,
  pay_year INT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adjustments_user ON salary_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_period ON salary_adjustments(pay_year, pay_month);


-- ── 5. RLS POLICIES ──────────────────────────────────────────────────────────

-- salary_configs
ALTER TABLE salary_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage salary configs"
  ON salary_configs FOR ALL
  USING (company_id = current_user_company_id() AND current_user_is_admin())
  WITH CHECK (company_id = current_user_company_id() AND current_user_is_admin());

CREATE POLICY "Employee can view own salary config"
  ON salary_configs FOR SELECT
  USING (user_id = auth.uid());

-- payroll_runs
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view company payroll"
  ON payroll_runs FOR SELECT
  USING (company_id = current_user_company_id() AND current_user_is_admin());

CREATE POLICY "Admin can insert draft payroll"
  ON payroll_runs FOR INSERT
  WITH CHECK (company_id = current_user_company_id() AND current_user_is_admin());

-- Database-enforced lock: only draft payroll can be updated or deleted
CREATE POLICY "Admin can update only draft payroll"
  ON payroll_runs FOR UPDATE
  USING (
    company_id = current_user_company_id()
    AND current_user_is_admin()
    AND status = 'draft'
  );

CREATE POLICY "Admin can delete only draft payroll"
  ON payroll_runs FOR DELETE
  USING (
    company_id = current_user_company_id()
    AND current_user_is_admin()
    AND status = 'draft'
  );

CREATE POLICY "Employee can view own payroll"
  ON payroll_runs FOR SELECT
  USING (user_id = auth.uid());

-- salary_adjustments
ALTER TABLE salary_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage adjustments"
  ON salary_adjustments FOR ALL
  USING (company_id = current_user_company_id() AND current_user_is_admin())
  WITH CHECK (company_id = current_user_company_id() AND current_user_is_admin());

CREATE POLICY "Employee can view own adjustments"
  ON salary_adjustments FOR SELECT
  USING (user_id = auth.uid());
