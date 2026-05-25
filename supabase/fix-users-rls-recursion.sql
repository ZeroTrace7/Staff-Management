-- Fix recursive RLS policies on public.users.
-- Run this once in Supabase SQL Editor for the live project.

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
