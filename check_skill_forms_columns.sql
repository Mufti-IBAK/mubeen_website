-- Check actual column names in skill_forms table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'skill_forms'
ORDER BY ordinal_position;

-- If the column is named 'form_schema' instead of 'schema', rename it
-- ALTER TABLE skill_forms RENAME COLUMN form_schema TO schema;

-- OR if column doesn't exist, add it
-- ALTER TABLE skill_forms ADD COLUMN IF NOT EXISTS schema JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
