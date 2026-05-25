-- ==========================================
-- Staff Management PWA - Supabase Schema
-- v1.1 — Fixes RLS bootstrap deadlock
-- ==========================================

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    admin_ids UUID[] DEFAULT '{}',
    geofence_lat FLOAT DEFAULT 0,
    geofence_lng FLOAT DEFAULT 0,
    geofence_radius INT NOT NULL DEFAULT 100, -- meters
    work_start_time TIME DEFAULT '09:00',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id), -- Matches Supabase Auth UID
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL UNIQUE,
    role TEXT CHECK (role IN ('admin', 'employee')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. ATTENDANCE LOGS TABLE
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    type TEXT CHECK (type IN ('clock_in', 'clock_out')),
    selfie_url TEXT,
    lat FLOAT,
    lng FLOAT,
    accuracy_meters FLOAT,
    timestamp TIMESTAMPTZ NOT NULL,
    is_geofence_valid BOOLEAN,
    distance_from_office FLOAT,
    notes TEXT,
    synced_offline BOOLEAN DEFAULT false,
    spoof_flags JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_company_id ON attendance_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_logs(timestamp);

-- 4. LAST KNOWN LOCATIONS
CREATE TABLE IF NOT EXISTS last_known_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    company_id UUID REFERENCES companies(id),
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    accuracy_meters FLOAT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_last_location_user ON last_known_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_last_location_company ON last_known_locations(company_id);

-- Helper functions keep RLS policies from recursively querying users as the caller.
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
$$;

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE last_known_locations ENABLE ROW LEVEL SECURITY;

-- ─── COMPANIES ──────────────────────────────────────────────────────────────

-- Any authenticated user can create a company (needed for first-admin bootstrap)
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
CREATE POLICY "Authenticated users can create companies"
ON companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own company
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company"
ON companies FOR SELECT USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Admins can update their own company (for geofence setup, settings)
DROP POLICY IF EXISTS "Admins can update their own company" ON companies;
CREATE POLICY "Admins can update their own company"
ON companies FOR UPDATE
USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ─── USERS ──────────────────────────────────────────────────────────────────

-- A user can insert their own profile row (id must match auth.uid)
-- This is what makes first-admin bootstrap possible
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile"
ON users FOR INSERT WITH CHECK (id = auth.uid());

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT USING (id = auth.uid());

-- Admins can view all users in their company
DROP POLICY IF EXISTS "Admins can view all users in their company" ON users;
CREATE POLICY "Admins can view all users in their company"
ON users FOR SELECT USING (
    public.current_user_is_admin()
    AND company_id = public.current_user_company_id()
);

-- Admins can insert employees into their company (for provisioning)
DROP POLICY IF EXISTS "Admins can insert users in their company" ON users;
CREATE POLICY "Admins can insert users in their company"
ON users FOR INSERT WITH CHECK (
    public.current_user_is_admin()
    AND company_id = public.current_user_company_id()
);

-- Admins can update users in their company (activate/deactivate)
DROP POLICY IF EXISTS "Admins can update users in their company" ON users;
CREATE POLICY "Admins can update users in their company"
ON users FOR UPDATE
USING (
    public.current_user_is_admin()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_admin()
    AND company_id = public.current_user_company_id()
);

-- ─── ATTENDANCE LOGS ────────────────────────────────────────────────────────

-- Employees can view their own attendance
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance_logs;
CREATE POLICY "Users can view their own attendance"
ON attendance_logs FOR SELECT USING (user_id = auth.uid());

-- Employees can insert their own attendance
DROP POLICY IF EXISTS "Users can insert their own attendance" ON attendance_logs;
CREATE POLICY "Users can insert their own attendance"
ON attendance_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all attendance in their company
DROP POLICY IF EXISTS "Admins can view company attendance logs" ON attendance_logs;
CREATE POLICY "Admins can view company attendance logs"
ON attendance_logs FOR SELECT USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ─── LAST KNOWN LOCATIONS ───────────────────────────────────────────────────

-- Users can manage their own location
DROP POLICY IF EXISTS "Users can manage their own location" ON last_known_locations;
CREATE POLICY "Users can manage their own location"
ON last_known_locations FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all locations in their company
DROP POLICY IF EXISTS "Admins can view company locations" ON last_known_locations;
CREATE POLICY "Admins can view company locations"
ON last_known_locations FOR SELECT USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
);

-- ==========================================
-- 6. CLEANUP OLD POLICIES (from v1.0 schema)
-- ==========================================
DROP POLICY IF EXISTS "Employees can view and insert their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON attendance_logs;
DROP POLICY IF EXISTS "Employees can update their own location" ON last_known_locations;
