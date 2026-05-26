-- Fix recursive RLS policies on public.users.
-- Run this once in Supabase SQL Editor for the live project.

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.last_known_locations ENABLE ROW LEVEL SECURITY;

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

INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
ON public.users FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies"
ON public.companies FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = ANY(admin_ids)
);

DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company"
ON public.companies FOR SELECT USING (
    auth.uid() = ANY(admin_ids)
    OR id = public.current_user_company_id()
);

DROP POLICY IF EXISTS "Admins can update their own company" ON public.companies;
CREATE POLICY "Admins can update their own company"
ON public.companies FOR UPDATE
USING (
    auth.uid() = ANY(admin_ids)
    OR (
        public.current_user_is_admin()
        AND id = public.current_user_company_id()
    )
)
WITH CHECK (
    auth.uid() = ANY(admin_ids)
    OR (
        public.current_user_is_admin()
        AND id = public.current_user_company_id()
    )
);

DROP POLICY IF EXISTS "Admins can view all users in their company" ON public.users;
CREATE POLICY "Admins can view all users in their company"
ON public.users FOR SELECT USING (
    public.current_user_is_admin()
    AND company_id = public.current_user_company_id()
);

DROP POLICY IF EXISTS "Admins can insert users in their company" ON public.users;
CREATE POLICY "Admins can insert users in their company"
ON public.users FOR INSERT WITH CHECK (
    public.current_user_is_admin()
    AND company_id = public.current_user_company_id()
);

DROP POLICY IF EXISTS "Admins can update users in their company" ON public.users;
CREATE POLICY "Admins can update users in their company"
ON public.users FOR UPDATE
USING (
    public.current_user_is_admin()
    AND company_id = public.current_user_company_id()
)
WITH CHECK (
    public.current_user_is_admin()
    AND company_id = public.current_user_company_id()
);

DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Employees can view and insert their own attendance" ON public.attendance_logs;
DROP POLICY IF EXISTS "Employees can insert their own attendance" ON public.attendance_logs;
CREATE POLICY "Users can insert their own attendance"
ON public.attendance_logs FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND company_id = public.current_user_company_id()
);

DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance_logs;
CREATE POLICY "Users can view their own attendance"
ON public.attendance_logs FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view company attendance logs" ON public.attendance_logs;
CREATE POLICY "Admins can view company attendance logs"
ON public.attendance_logs FOR SELECT USING (
    public.current_user_is_admin()
    AND company_id = public.current_user_company_id()
);

DROP POLICY IF EXISTS "Users can manage their own location" ON public.last_known_locations;
DROP POLICY IF EXISTS "Employees can update their own location" ON public.last_known_locations;
CREATE POLICY "Users can manage their own location"
ON public.last_known_locations FOR ALL
USING (user_id = auth.uid())
WITH CHECK (
    user_id = auth.uid()
    AND company_id = public.current_user_company_id()
);

DROP POLICY IF EXISTS "Admins can view company locations" ON public.last_known_locations;
CREATE POLICY "Admins can view company locations"
ON public.last_known_locations FOR SELECT USING (
    public.current_user_is_admin()
    AND company_id = public.current_user_company_id()
);

DROP POLICY IF EXISTS "Users can upload own selfies" ON storage.objects;
CREATE POLICY "Users can upload own selfies"
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'selfies'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1) = public.current_user_company_id()::TEXT
    AND split_part(name, '/', 2) = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "Users can view own selfies" ON storage.objects;
CREATE POLICY "Users can view own selfies"
ON storage.objects FOR SELECT USING (
    bucket_id = 'selfies'
    AND split_part(name, '/', 2) = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "Admins can view company selfies" ON storage.objects;
CREATE POLICY "Admins can view company selfies"
ON storage.objects FOR SELECT USING (
    bucket_id = 'selfies'
    AND public.current_user_is_admin()
    AND split_part(name, '/', 1) = public.current_user_company_id()::TEXT
);
