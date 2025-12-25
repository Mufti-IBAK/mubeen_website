-- The skill_forms table has 'fields' column but the API expects 'schema'
-- Option 1: Rename 'fields' to 'schema' to match the API
ALTER TABLE skill_forms RENAME COLUMN fields TO schema;

-- Refresh the PostgREST schema cache so Supabase recognizes the change
NOTIFY pgrst, 'reload schema';

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'skill_forms' 
ORDER BY ordinal_position;
