-- Check if skill_forms table exists and has proper constraints
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'skill_forms';

-- If table doesn't exist or constraints are missing, create/fix them
-- This SQL creates the skill_forms table with proper unique constraint

CREATE TABLE IF NOT EXISTS skill_forms (
    id BIGSERIAL PRIMARY KEY,
    skill_id BIGINT REFERENCES skills(id) ON DELETE CASCADE,
    form_type TEXT NOT NULL DEFAULT 'individual',
    schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(skill_id, form_type)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_skill_forms_skill_id ON skill_forms(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_forms_form_type ON skill_forms(form_type);
