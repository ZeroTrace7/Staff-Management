-- ==========================================
-- Staff Management PWA - Supabase Schema
-- ==========================================

-- Enable PostGIS extension for accurate distance calculations if needed later
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    admin_ids UUID[] DEFAULT '{}',
    geofence_lat FLOAT NOT NULL,
    geofence_lng FLOAT NOT NULL,
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
    spoof_flags JSONB, -- e.g., {"jitter": false, "teleport": false, "consistency": false}
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_company_id ON attendance_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_logs(timestamp);

-- 4. LAST KNOWN LOCATIONS (V1 Passive Tracking)
CREATE TABLE IF NOT EXISTS last_known_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE, -- One row per employee
    company_id UUID REFERENCES companies(id),
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    accuracy_meters FLOAT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_last_location_user ON last_known_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_last_location_company ON last_known_locations(company_id);

-- 5. ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE last_known_locations ENABLE ROW LEVEL SECURITY;

-- Users RLS Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" 
ON users FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can view all users in their company" ON users;
CREATE POLICY "Admins can view all users in their company" 
ON users FOR SELECT USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can insert users in their company" ON users;
CREATE POLICY "Admins can insert users in their company" 
ON users FOR INSERT WITH CHECK (
    company_id IN (
        SELECT company_id FROM users WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
);

-- Attendance Logs RLS Policies
DROP POLICY IF EXISTS "Employees can view and insert their own attendance" ON attendance_logs;
CREATE POLICY "Employees can view and insert their own attendance" 
ON attendance_logs FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Employees can insert their own attendance" ON attendance_logs;
CREATE POLICY "Employees can insert their own attendance" 
ON attendance_logs FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view company attendance logs" ON attendance_logs;
CREATE POLICY "Admins can view company attendance logs" 
ON attendance_logs FOR SELECT USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
);

-- Last Known Locations RLS
DROP POLICY IF EXISTS "Employees can update their own location" ON last_known_locations;
CREATE POLICY "Employees can update their own location" 
ON last_known_locations FOR ALL USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view company locations" ON last_known_locations;
CREATE POLICY "Admins can view company locations" 
ON last_known_locations FOR SELECT USING (
    company_id IN (
        SELECT company_id FROM users WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
);

-- Companies RLS
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" 
ON companies FOR SELECT USING (
    id IN (SELECT company_id FROM users WHERE id = (SELECT auth.uid()))
);
