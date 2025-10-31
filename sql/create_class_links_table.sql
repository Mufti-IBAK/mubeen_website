-- Create class_links table to store classroom links for user enrollments
-- This table links a specific user's enrollment to their classroom access URL

CREATE TABLE IF NOT EXISTS public.class_links (
  id BIGSERIAL PRIMARY KEY,
  
  -- Reference to the enrollment in success_enroll table
  enrollment_id BIGINT NOT NULL REFERENCES public.success_enroll(id) ON DELETE CASCADE,
  
  -- Denormalized data for easier querying and reporting
  user_id UUID NOT NULL,
  program_id BIGINT NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  
  -- The classroom link URL
  classroom_link TEXT NOT NULL,
  
  -- Track who created/updated the link
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one link per enrollment
  UNIQUE(enrollment_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_class_links_enrollment_id ON public.class_links(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_class_links_user_id ON public.class_links(user_id);
CREATE INDEX IF NOT EXISTS idx_class_links_program_id ON public.class_links(program_id);
CREATE INDEX IF NOT EXISTS idx_class_links_user_program ON public.class_links(user_id, program_id);

-- Add comment for documentation
COMMENT ON TABLE public.class_links IS 'Stores classroom access links for paid enrollments. Admin-only create/update, users can read their own links.';

-- Enable Row Level Security
ALTER TABLE public.class_links ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to class_links"
  ON public.class_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Users can view their own class links
CREATE POLICY "Users can view their own class_links"
  ON public.class_links
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_class_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_class_links_updated_at
  BEFORE UPDATE ON public.class_links
  FOR EACH ROW
  EXECUTE FUNCTION update_class_links_updated_at();
