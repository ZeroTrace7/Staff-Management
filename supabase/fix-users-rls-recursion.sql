-- Fix recursive RLS policies on public.users.
-- Run this once in Supabase SQL Editor for the live project.

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

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
