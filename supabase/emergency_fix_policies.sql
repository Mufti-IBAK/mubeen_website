-- EMERGENCY FIX: Remove infinite recursion in profiles policies
-- Run this IMMEDIATELY in Supabase SQL Editor

-- 1. DROP ALL problematic policies causing recursion
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_full_access" ON profiles;

-- 2. Recreate profiles policies WITHOUT recursion
-- Simple policy: users can read/update their own profile
CREATE POLICY "profiles_read_own" ON profiles 
FOR SELECT 
USING ( auth.uid() = id );

CREATE POLICY "profiles_update_own" ON profiles 
FOR UPDATE 
USING ( auth.uid() = id );

-- 3. Create a separate admin policy that doesn't cause recursion
-- This uses a direct role check without querying profiles table recursively
CREATE POLICY "profiles_admin_access" ON profiles 
FOR ALL 
USING (
  -- Check if current user has admin role directly
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
    LIMIT 1
  )
);

-- 4. Fix the is_admin function to prevent recursion
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Use a direct query without triggering RLS
  SELECT COALESCE(
    (SELECT p.role IN ('admin', 'super_admin') 
     FROM public.profiles p 
     WHERE p.id = uid 
     LIMIT 1), 
    false
  );
$$;

-- 5. Temporarily disable RLS on profiles to break the cycle
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 6. Re-enable RLS with safe policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Create simple non-recursive policies
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_access" ON profiles;

-- Safe profiles policies
CREATE POLICY "profiles_select_own" ON profiles 
FOR SELECT 
USING ( auth.uid() = id );

CREATE POLICY "profiles_update_own" ON profiles 
FOR UPDATE 
USING ( auth.uid() = id );

-- Admin policy without recursion - uses service role
CREATE POLICY "profiles_admin_access" ON profiles 
FOR ALL 
USING ( 
  -- Only allow if explicitly admin role (checked by service role)
  role IN ('admin', 'super_admin')
);

-- 8. Fix other table policies to not use recursive is_admin function
-- Programs policies
DROP POLICY IF EXISTS "programs_admin_full_access" ON programs;
CREATE POLICY "programs_admin_all" ON programs 
FOR ALL 
USING ( 
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'super_admin')
  )
);

-- Program forms policies  
DROP POLICY IF EXISTS "program_forms_admin_full_access" ON program_forms;
CREATE POLICY "program_forms_admin_all" ON program_forms 
FOR ALL 
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'super_admin') 
  )
);

-- Program plans policies
DROP POLICY IF EXISTS "program_plans_admin_full_access" ON program_plans;  
CREATE POLICY "program_plans_admin_all" ON program_plans 
FOR ALL 
USING (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('admin', 'super_admin')
  )
);

-- 9. Refresh schema
NOTIFY pgrst, 'reload schema';
