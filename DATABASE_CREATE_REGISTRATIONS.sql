-- ============================================================================
-- DATABASE SETUP: Create program_registrations table
-- ============================================================================
-- This table stores form submissions when users register for programs

-- Create the program_registrations table
CREATE TABLE IF NOT EXISTS program_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id INT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL, -- Stores the complete filled form as JSON
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_program_registrations_program_id ON program_registrations(program_id);
CREATE INDEX idx_program_registrations_user_id ON program_registrations(user_id);
CREATE INDEX idx_program_registrations_created_at ON program_registrations(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE program_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can INSERT their own registrations
CREATE POLICY "Users can insert their own registrations"
  ON program_registrations FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Policy: Admins can SELECT all registrations
CREATE POLICY "Admins can view all registrations"
  ON program_registrations FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- Policy: Users can SELECT their own registrations
CREATE POLICY "Users can view their own registrations"
  ON program_registrations FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Policy: Admins can DELETE registrations
CREATE POLICY "Admins can delete registrations"
  ON program_registrations FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- ============================================================================
-- End of setup. Table is ready to use.
-- ============================================================================
