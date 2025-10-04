-- Add Draft Registration Support
-- This enables users to save their progress and continue later

-- Add draft support columns to enrollments table
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS draft_data JSONB,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS registration_type form_type DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS family_size INTEGER,
ADD COLUMN IF NOT EXISTS form_data JSONB;

-- Create index for efficient draft queries
CREATE INDEX IF NOT EXISTS idx_enrollments_draft_user 
ON enrollments(user_id, is_draft, last_edited_at) 
WHERE is_draft = TRUE;

-- Create a function to update last_edited_at automatically
CREATE OR REPLACE FUNCTION update_last_edited_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_edited_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update last_edited_at on changes
DROP TRIGGER IF EXISTS trigger_update_last_edited_at ON enrollments;
CREATE TRIGGER trigger_update_last_edited_at
    BEFORE UPDATE ON enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_last_edited_at();

-- Update RLS policies to include draft access (use existing enrollment policies)
-- The enrollments table already has appropriate RLS policies from schema.sql
-- We just need to ensure they support drafts

-- Create a view for easy draft queries
CREATE OR REPLACE VIEW user_drafts AS
SELECT 
    e.*,
    p.title as program_title,
    p.image_url as program_image,
    pr.full_name as user_name,
    pr.email as user_email
FROM enrollments e
LEFT JOIN programs p ON e.program_id = p.id
LEFT JOIN courses c ON e.course_id = c.id
JOIN profiles pr ON e.user_id = pr.id
WHERE e.is_draft = TRUE;

-- Grant access to the view
GRANT SELECT ON user_drafts TO authenticated;

-- Create helper function to clean up old drafts (optional - run manually or via cron)
CREATE OR REPLACE FUNCTION cleanup_old_drafts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete drafts older than 30 days
    DELETE FROM enrollments 
    WHERE is_draft = TRUE 
    AND last_edited_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to convert draft to final enrollment
CREATE OR REPLACE FUNCTION finalize_draft_registration(draft_id UUID)
RETURNS UUID AS $$
DECLARE
    final_registration_id UUID;
BEGIN
    -- Update the draft to be a final enrollment
    UPDATE enrollments
    SET 
        is_draft = FALSE,
        form_data = draft_data,
        draft_data = NULL,
        status = 'pending',
        last_edited_at = NOW()
    WHERE id = draft_id
    AND is_draft = TRUE
    AND user_id = auth.uid()
    RETURNING id INTO final_registration_id;
    
    RETURN final_registration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION finalize_draft_registration(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_drafts() TO authenticated;
