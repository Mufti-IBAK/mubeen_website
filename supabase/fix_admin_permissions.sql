-- Fix Admin Permissions and RLS Policies
-- Run this in Supabase SQL Editor

-- 1. Ensure admin user exists and has proper role
-- Replace 'your-admin-email@example.com' with your actual admin email
UPDATE profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your-admin-email@example.com'
);

-- If the above doesn't work because user doesn't exist in profiles, create it:
-- First, get your user ID by running: SELECT id, email FROM auth.users WHERE email = 'your-admin-email@example.com';
-- Then insert into profiles (replace the UUID with your actual user ID):
-- INSERT INTO profiles (id, role, email) VALUES ('your-user-id-uuid', 'admin', 'your-admin-email@example.com') ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 2. Drop and recreate RLS policies to ensure they work correctly

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
DROP POLICY IF EXISTS "programs_read_all" ON programs;
DROP POLICY IF EXISTS "programs_admin_write" ON programs;
DROP POLICY IF EXISTS "programs_admin_update" ON programs;
DROP POLICY IF EXISTS "programs_admin_delete" ON programs;

-- Recreate profiles policies
CREATE POLICY "profiles_read_own" ON profiles 
FOR SELECT 
USING ( 
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM profiles p2 
    WHERE p2.id = auth.uid() 
    AND p2.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "profiles_update_own" ON profiles 
FOR UPDATE 
USING ( auth.uid() = id );

CREATE POLICY "profiles_admin_full_access" ON profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p2 
    WHERE p2.id = auth.uid() 
    AND p2.role IN ('admin', 'super_admin')
  )
);

-- Recreate programs policies
CREATE POLICY "programs_read_all" ON programs 
FOR SELECT 
USING ( true );

CREATE POLICY "programs_admin_full_access" ON programs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

-- 3. Drop and recreate program_plans and program_forms policies
DROP POLICY IF EXISTS "program_plans_read_all" ON program_plans;
DROP POLICY IF EXISTS "program_plans_admin_full_access" ON program_plans;
DROP POLICY IF EXISTS "program_plans_admin_write" ON program_plans;
DROP POLICY IF EXISTS "program_plans_admin_update" ON program_plans;
DROP POLICY IF EXISTS "program_plans_admin_delete" ON program_plans;

CREATE POLICY "program_plans_read_all" ON program_plans 
FOR SELECT 
USING ( true );

CREATE POLICY "program_plans_admin_full_access" ON program_plans 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "program_forms_read_all" ON program_forms;
DROP POLICY IF EXISTS "program_forms_admin_full_access" ON program_forms;
DROP POLICY IF EXISTS "program_forms_admin_write" ON program_forms;
DROP POLICY IF EXISTS "program_forms_admin_update" ON program_forms;
DROP POLICY IF EXISTS "program_forms_admin_delete" ON program_forms;

CREATE POLICY "program_forms_read_all" ON program_forms 
FOR SELECT 
USING ( true );

CREATE POLICY "program_forms_admin_full_access" ON program_forms 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

-- 4. Update the is_admin function to be more robust
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p 
    WHERE p.id = uid 
    AND p.role IN ('admin', 'super_admin')
  );
$$;

-- 5. Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- 7. Check admin status - run this to verify your admin setup
-- SELECT 
--   u.email,
--   p.role,
--   p.id,
--   public.is_admin(p.id) as is_admin_check
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- WHERE u.email = 'your-admin-email@example.com';

-- 8. Fix date columns in programs table if they exist as text
-- Check if we need to alter column types
DO $$
BEGIN
    -- Check if start_date column exists and is text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'programs' 
        AND column_name = 'start_date' 
        AND data_type = 'text'
    ) THEN
        -- Convert text dates to proper date type
        UPDATE programs 
        SET start_date = NULL 
        WHERE start_date = '' OR start_date IS NULL OR start_date = 'null';
        
        -- Alter column type
        ALTER TABLE programs 
        ALTER COLUMN start_date TYPE date 
        USING CASE 
            WHEN start_date ~ '^\d{4}-\d{2}-\d{2}' THEN start_date::date 
            ELSE NULL 
        END;
    END IF;
    
    -- Same for enrollment_deadline
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'programs' 
        AND column_name = 'enrollment_deadline' 
        AND data_type = 'text'
    ) THEN
        UPDATE programs 
        SET enrollment_deadline = NULL 
        WHERE enrollment_deadline = '' OR enrollment_deadline IS NULL OR enrollment_deadline = 'null';
        
        ALTER TABLE programs 
        ALTER COLUMN enrollment_deadline TYPE date 
        USING CASE 
            WHEN enrollment_deadline ~ '^\d{4}-\d{2}-\d{2}' THEN enrollment_deadline::date 
            ELSE NULL 
        END;
    END IF;
END $$;
