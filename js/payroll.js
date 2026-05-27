/**
 * Payroll Module — js/payroll.js
 * Phase 1: Salary config + working hours calculation from attendance_logs.
 * Phase 2: Monthly payroll generation (full CTC minus deductions model).
 * Phase 3: Salary slip HTML + print.
 */

const Payroll = {

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  _requireClient() {
    if (!window.staffSupabaseClient) {
      throw new Error('Backend connection is unavailable.');
    }
    return window.staffSupabaseClient;
  },

  /**
   * Count weekdays (Mon–Fri) in a given month/year.
   * Used when daily_rate_method = 'actual'.
   */
  _countWeekdaysInMonth(month, year) {
    let count = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month - 1, d).getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  },

  /**
   * Get base days for daily rate calculation.
   */
  _getBaseDays(method, month, year) {
    if (method === '30_day') return 30;
    if (method === 'actual') return this._countWeekdaysInMonth(month, year);
    return 26; // default '26_day'
  },

  /**
   * Format currency for display.
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  },

  // ─── SALARY CONFIG CRUD ─────────────────────────────────────────────────────

  /**
   * Get the active salary config for an employee.
   */
  async getSalaryConfig(userId) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('salary_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .is('effective_to', null)
        .maybeSingle();

      if (error) {
        console.error('[Payroll] getSalaryConfig error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[Payroll] getSalaryConfig error:', err.message);
      return null;
    }
  },

  /**
   * Save or update salary config for an employee.
   * Deactivates any existing active config before creating the new one.
   */
  async saveSalaryConfig(userId, companyId, config) {
    try {
      const client = this._requireClient();

      // Deactivate existing active config
      const existing = await this.getSalaryConfig(userId);
      if (existing) {
        const { error: deactivateError } = await client
          .from('salary_configs')
          .update({
            is_active: false,
            effective_to: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (deactivateError) {
          console.error('[Payroll] deactivate old config error:', deactivateError.message);
          throw deactivateError;
        }
      }

      // Insert new active config
      const { data, error } = await client
        .from('salary_configs')
        .insert({
          user_id: userId,
          company_id: companyId,
          monthly_ctc: config.monthly_ctc,
          basic_pct: config.basic_pct || 50,
          hra_pct: config.hra_pct || 20,
          bank_account: config.bank_account || null,
          bank_ifsc: config.bank_ifsc || null,
          pan: config.pan || null,
          uan: config.uan || null,
          effective_from: new Date().toISOString().split('T')[0],
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[Payroll] Salary config saved for user:', userId);
      return { success: true, config: data };
    } catch (err) {
      console.error('[Payroll] saveSalaryConfig error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get all salary configs for a company (for payroll generation).
   */
  async getCompanySalaryConfigs(companyId) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('salary_configs')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .is('effective_to', null);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Payroll] getCompanySalaryConfigs error:', err.message);
      return [];
    }
  },

  // ─── COMPANY PAYROLL SETTINGS ───────────────────────────────────────────────

  /**
   * Save payroll-specific settings to the companies table.
   */
  async savePayrollSettings(companyId, settings) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('companies')
        .update({
          daily_rate_method: settings.daily_rate_method || '26_day',
          work_hours_per_day: settings.work_hours_per_day || 8,
          late_grace_minutes: settings.late_grace_minutes || 15,
          late_marks_per_half_day: settings.late_marks_per_half_day || 3,
          overtime_multiplier: settings.overtime_multiplier || 2.0
        })
        .eq('id', companyId)
        .select()
        .single();

      if (error) throw error;

      console.log('[Payroll] Payroll settings saved for company:', companyId);
      return { success: true, company: data };
    } catch (err) {
      console.error('[Payroll] savePayrollSettings error:', err.message);
      return { success: false, error: err.message };
    }
  },

  // ─── WORKING HOURS CALCULATION ──────────────────────────────────────────────

  /**
   * Calculate working hours from attendance_logs for a specific user and month.
   * Returns an object with per-day breakdown and monthly totals.
   */
  async calculateWorkingHours(userId, companyId, month, year, company) {
    try {
      const client = this._requireClient();

      // Build date range for the month (UTC)
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 1)); // first day of next month

      const { data: logs, error } = await client
        .from('attendance_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .gte('timestamp', startDate.toISOString())
        .lt('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Company settings
      const workHoursPerDay = Number(company?.work_hours_per_day) || 8;
      const graceMinutes = Number(company?.late_grace_minutes) || 15;
      const workStartTime = company?.work_start_time || '09:00';
      const [startH, startM] = workStartTime.split(':').map(Number);
      const workStartMinutes = (startH || 0) * 60 + (startM || 0);
      const overtimeMultiplier = Number(company?.overtime_multiplier) || 2.0;

      // Group logs by calendar day (local timezone)
      const dayMap = {};
      for (const log of (logs || [])) {
        const dt = new Date(log.timestamp);
        const dayKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        if (!dayMap[dayKey]) dayMap[dayKey] = [];
        dayMap[dayKey].push(log);
      }

      let daysPresent = 0;
      let halfDays = 0;
      let daysAbsent = 0;
      let lateMarks = 0;
      let totalOvertimeHours = 0;
      let totalHoursWorked = 0;
      const dailyBreakdown = [];

      // Process each day in the month
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = new Date(year, month - 1, d).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayLogs = dayMap[dayKey] || [];

        // Skip weekends for attendance tracking (they're not working days)
        if (isWeekend && dayLogs.length === 0) continue;

        // Pair clock_in / clock_out
        let hoursWorked = 0;
        let isLate = false;
        const clockIns = dayLogs.filter(l => l.type === 'clock_in');
        const clockOuts = dayLogs.filter(l => l.type === 'clock_out');

        for (let i = 0; i < clockIns.length; i++) {
          const cin = new Date(clockIns[i].timestamp);
          // Find matching clock_out (next clock_out after this clock_in)
          const cout = clockOuts.find(co => new Date(co.timestamp) > cin);
          if (cout) {
            hoursWorked += (new Date(cout.timestamp) - cin) / (1000 * 60 * 60);
          } else if (i === clockIns.length - 1) {
            // Still clocked in — don't count partial hours for payroll
          }
        }

        // Check late (first clock_in of the day)
        if (clockIns.length > 0) {
          const firstCin = new Date(clockIns[0].timestamp);
          const actualMinutes = firstCin.getHours() * 60 + firstCin.getMinutes();
          if (actualMinutes > workStartMinutes + graceMinutes) {
            isLate = true;
            lateMarks++;
          }
        }

        // Determine day status
        let status = 'absent';
        if (hoursWorked >= workHoursPerDay) {
          status = 'full';
          daysPresent++;
        } else if (hoursWorked >= workHoursPerDay / 2) {
          status = 'half';
          halfDays++;
        } else if (dayLogs.length > 0 && hoursWorked > 0) {
          // Worked some hours but less than half day — still counts as half
          status = 'half';
          halfDays++;
        } else if (!isWeekend) {
          // Only count weekdays as absent
          const today = new Date();
          const checkDate = new Date(year, month - 1, d);
          if (checkDate < today) {
            daysAbsent++;
          }
        }

        // Overtime (only on full days)
        let overtimeHrs = 0;
        if (status === 'full' && hoursWorked > workHoursPerDay) {
          overtimeHrs = hoursWorked - workHoursPerDay;
          totalOvertimeHours += overtimeHrs;
        }

        totalHoursWorked += hoursWorked;

        dailyBreakdown.push({
          date: dayKey,
          dayOfWeek,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          status,
          isLate,
          overtimeHours: Math.round(overtimeHrs * 100) / 100
        });
      }

      return {
        userId,
        month,
        year,
        daysPresent,
        halfDays,
        daysAbsent,
        lateMarks,
        overtimeHours: Math.round(totalOvertimeHours * 100) / 100,
        totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
        dailyBreakdown
      };
    } catch (err) {
      console.error('[Payroll] calculateWorkingHours error:', err.message);
      return {
        userId, month, year,
        daysPresent: 0, halfDays: 0, daysAbsent: 0,
        lateMarks: 0, overtimeHours: 0, totalHoursWorked: 0,
        dailyBreakdown: []
      };
    }
  },

  /**
   * Calculate today's worked hours for a single user (for dashboard display).
   * Returns hours as a number.
   */
  calculateTodayHours(todayLogs) {
    if (!todayLogs || todayLogs.length === 0) return 0;

    const clockIns = todayLogs.filter(l => l.type === 'clock_in');
    const clockOuts = todayLogs.filter(l => l.type === 'clock_out');
    let hours = 0;

    for (let i = 0; i < clockIns.length; i++) {
      const cin = new Date(clockIns[i].timestamp);
      const cout = clockOuts.find(co => new Date(co.timestamp) > cin);
      if (cout) {
        hours += (new Date(cout.timestamp) - cin) / (1000 * 60 * 60);
      } else {
        // Currently clocked in — count time until now
        hours += (Date.now() - cin.getTime()) / (1000 * 60 * 60);
      }
    }

    return Math.round(hours * 100) / 100;
  },

  /**
   * Format hours for display: "6h 32m" or "0h 0m".
   */
  formatHours(decimalHours) {
    if (!decimalHours || decimalHours <= 0) return '0h 0m';
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}h ${m}m`;
  },

  // ─── PHASE 2: PAYROLL GENERATION ENGINE ─────────────────────────────────────

  /**
   * Generate monthly payroll for all employees with salary configs.
   * Uses the corrected Full-CTC-minus-deductions model (no double deduction).
   */
  async generateMonthlyPayroll(companyId, month, year) {
    try {
      const client = this._requireClient();

      // 1. Get company settings
      const { data: company, error: companyErr } = await client
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      if (companyErr) throw companyErr;

      // 2. Get all active salary configs
      const salaryConfigs = await this.getCompanySalaryConfigs(companyId);
      if (!salaryConfigs.length) {
        return { success: false, error: 'No salary configurations found. Set up salary for employees first.' };
      }

      // 3. Get employee names for display
      const { data: users } = await client
        .from('users')
        .select('id, name, email')
        .eq('company_id', companyId)
        .eq('is_active', true);
      const userMap = {};
      for (const u of (users || [])) userMap[u.id] = u;

      // 4. Get existing adjustments for this month
      const { data: adjustments } = await client
        .from('salary_adjustments')
        .select('*')
        .eq('company_id', companyId)
        .eq('pay_month', month)
        .eq('pay_year', year);
      const adjByUser = {};
      for (const adj of (adjustments || [])) {
        if (!adjByUser[adj.user_id]) adjByUser[adj.user_id] = [];
        adjByUser[adj.user_id].push(adj);
      }

      const results = [];
      const errors = [];

      // 5. Process each employee with salary config
      for (const config of salaryConfigs) {
        try {
          // Calculate working hours from attendance_logs
          const attendance = await this.calculateWorkingHours(
            config.user_id, companyId, month, year, company
          );

          // Company settings snapshot
          const method = company.daily_rate_method || '26_day';
          const workHours = Number(company.work_hours_per_day) || 8;
          const otMultiplier = Number(company.overtime_multiplier) || 2.0;
          const latePerHalfDay = Number(company.late_marks_per_half_day) || 3;

          // Base days
          const baseDays = this._getBaseDays(method, month, year);
          const dailyRate = Number(config.monthly_ctc) / baseDays;

          // Step 1: Full CTC components
          const ctc = Number(config.monthly_ctc);
          const basicFull = ctc * Number(config.basic_pct) / 100;
          const hraFull = ctc * Number(config.hra_pct) / 100;
          const specialFull = ctc - basicFull - hraFull;

          // Step 2: Late deduction days
          const lateDeductionDays = Math.floor(attendance.lateMarks / latePerHalfDay) * 0.5;

          // Step 3: Deductions (from full CTC)
          const lopDeduction = attendance.daysAbsent * dailyRate;
          const halfDayDeduction = attendance.halfDays * 0.5 * dailyRate;
          const lateDeduction = lateDeductionDays * dailyRate;

          // Step 4: Overtime
          const hourlyRate = dailyRate / workHours;
          const overtimePay = attendance.overtimeHours * hourlyRate * otMultiplier;

          // Step 5: Adjustments
          const userAdj = adjByUser[config.user_id] || [];
          let bonusTotal = 0;
          let otherDeductions = 0;
          for (const adj of userAdj) {
            if (adj.amount > 0) bonusTotal += Number(adj.amount);
            else otherDeductions += Math.abs(Number(adj.amount));
          }

          // Step 6: Totals
          const grossFull = basicFull + hraFull + specialFull + overtimePay;
          const totalDeductions = lopDeduction + halfDayDeduction + lateDeduction + otherDeductions;
          const totalAdditions = overtimePay + bonusTotal;
          const netPay = grossFull - totalDeductions + bonusTotal;

          // Round all values
          const round = v => Math.round(v * 100) / 100;

          const payrollRow = {
            user_id: config.user_id,
            company_id: companyId,
            pay_month: month,
            pay_year: year,
            // Snapshot
            salary_config_id: config.id,
            snapshot_monthly_ctc: ctc,
            snapshot_basic_pct: Number(config.basic_pct),
            snapshot_hra_pct: Number(config.hra_pct),
            snapshot_daily_rate_method: method,
            snapshot_work_hours_per_day: workHours,
            snapshot_overtime_multiplier: otMultiplier,
            // Attendance
            base_days: baseDays,
            days_present: attendance.daysPresent,
            half_days: attendance.halfDays,
            days_absent: attendance.daysAbsent,
            late_marks: attendance.lateMarks,
            late_deduction_days: lateDeductionDays,
            overtime_hours: attendance.overtimeHours,
            // Earnings
            basic_full: round(basicFull),
            hra_full: round(hraFull),
            special_full: round(specialFull),
            overtime_pay: round(overtimePay),
            gross_full: round(grossFull),
            // Deductions
            lop_deduction: round(lopDeduction),
            half_day_deduction: round(halfDayDeduction),
            late_deduction: round(lateDeduction),
            other_deductions: round(otherDeductions),
            total_deductions: round(totalDeductions),
            // Additions
            bonus: round(bonusTotal),
            total_additions: round(totalAdditions),
            // Net
            net_pay: round(netPay),
            status: 'draft'
          };

          // Upsert — if a draft already exists for this employee+month, replace it
          const { data: existing } = await client
            .from('payroll_runs')
            .select('id, status')
            .eq('user_id', config.user_id)
            .eq('pay_month', month)
            .eq('pay_year', year)
            .maybeSingle();

          if (existing) {
            if (existing.status !== 'draft') {
              errors.push(`${userMap[config.user_id]?.name || config.user_id}: Payroll already confirmed/paid — skipped.`);
              continue;
            }
            // Update existing draft
            const { error: updateErr } = await client
              .from('payroll_runs')
              .update(payrollRow)
              .eq('id', existing.id);
            if (updateErr) throw updateErr;
            payrollRow.id = existing.id;
          } else {
            // Insert new
            const { data: inserted, error: insertErr } = await client
              .from('payroll_runs')
              .insert(payrollRow)
              .select()
              .single();
            if (insertErr) throw insertErr;
            payrollRow.id = inserted.id;
          }

          results.push({
            ...payrollRow,
            employeeName: userMap[config.user_id]?.name || 'Unknown',
            employeeEmail: userMap[config.user_id]?.email || ''
          });
        } catch (empErr) {
          errors.push(`${userMap[config.user_id]?.name || config.user_id}: ${empErr.message}`);
        }
      }

      console.log(`[Payroll] Generated ${results.length} payroll runs for ${month}/${year}`);
      return { success: true, runs: results, errors };
    } catch (err) {
      console.error('[Payroll] generateMonthlyPayroll error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get payroll summary for a company + month (for display).
   */
  async getPayrollSummary(companyId, month, year) {
    try {
      const client = this._requireClient();

      const { data: runs, error } = await client
        .from('payroll_runs')
        .select('*')
        .eq('company_id', companyId)
        .eq('pay_month', month)
        .eq('pay_year', year)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!runs || !runs.length) return { runs: [], users: {} };

      // Get user details
      const userIds = runs.map(r => r.user_id);
      const { data: users } = await client
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      const userMap = {};
      for (const u of (users || [])) userMap[u.id] = u;

      return { runs, users: userMap };
    } catch (err) {
      console.error('[Payroll] getPayrollSummary error:', err.message);
      return { runs: [], users: {} };
    }
  },

  /**
   * Confirm a payroll run (locks it via RLS — no more edits possible).
   */
  async confirmPayroll(companyId, month, year, confirmedByUserId) {
    try {
      const client = this._requireClient();

      const { data, error } = await client
        .from('payroll_runs')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: confirmedByUserId
        })
        .eq('company_id', companyId)
        .eq('pay_month', month)
        .eq('pay_year', year)
        .eq('status', 'draft')
        .select();

      if (error) throw error;

      console.log(`[Payroll] Confirmed ${data?.length || 0} payroll runs for ${month}/${year}`);
      return { success: true, confirmed: data?.length || 0 };
    } catch (err) {
      console.error('[Payroll] confirmPayroll error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Add a salary adjustment (bonus, fine, advance recovery, etc.).
   */
  async addAdjustment(userId, companyId, type, amount, description, month, year) {
    try {
      const client = this._requireClient();

      // Ensure amount sign matches type
      let finalAmount = Math.abs(Number(amount));
      if (['advance_recovery', 'fine', 'other_deduction'].includes(type)) {
        finalAmount = -finalAmount;
      }

      const { data, error } = await client
        .from('salary_adjustments')
        .insert({
          user_id: userId,
          company_id: companyId,
          type,
          amount: finalAmount,
          description: description || null,
          pay_month: month,
          pay_year: year
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`[Payroll] Adjustment added: ${type} ${finalAmount} for user ${userId}`);
      return { success: true, adjustment: data };
    } catch (err) {
      console.error('[Payroll] addAdjustment error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete a draft payroll run (only works on draft status due to RLS).
   */
  async deletePayrollRun(runId) {
    try {
      const client = this._requireClient();
      const { error } = await client
        .from('payroll_runs')
        .delete()
        .eq('id', runId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[Payroll] deletePayrollRun error:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get adjustments for a specific employee + month.
   */
  async getAdjustments(userId, companyId, month, year) {
    try {
      const client = this._requireClient();
      const { data, error } = await client
        .from('salary_adjustments')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('pay_month', month)
        .eq('pay_year', year);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Payroll] getAdjustments error:', err.message);
      return [];
    }
  }
};

window.Payroll = Payroll;

