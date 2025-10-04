-- Fix any datetime field types in existing form schemas
-- Run this in Supabase SQL Editor if needed

-- This will update any form fields that have type "datetime" to use "datetime-local"
-- which is the correct HTML5 input type

DO $$
DECLARE
    form_record RECORD;
    updated_schema JSONB;
    field_record JSONB;
    updated_fields JSONB := '[]'::jsonb;
BEGIN
    -- Loop through all program forms
    FOR form_record IN 
        SELECT id, schema FROM program_forms 
        WHERE schema IS NOT NULL
    LOOP
        updated_fields := '[]'::jsonb;
        
        -- Loop through fields in the schema
        FOR field_record IN 
            SELECT * FROM jsonb_array_elements(form_record.schema->'fields')
        LOOP
            -- Check if field type is "datetime" and update to "datetime-local"
            IF field_record->>'type' = 'datetime' THEN
                field_record := jsonb_set(field_record, '{type}', '"datetime-local"');
            END IF;
            
            -- Add field to updated fields array
            updated_fields := updated_fields || field_record;
        END LOOP;
        
        -- Update the schema with new fields
        updated_schema := jsonb_set(form_record.schema, '{fields}', updated_fields);
        
        -- Update the database record
        UPDATE program_forms 
        SET schema = updated_schema 
        WHERE id = form_record.id;
    END LOOP;
    
    -- Also check course_forms if they exist
    FOR form_record IN 
        SELECT id, schema FROM course_forms 
        WHERE schema IS NOT NULL
    LOOP
        updated_fields := '[]'::jsonb;
        
        -- Loop through fields in the schema
        FOR field_record IN 
            SELECT * FROM jsonb_array_elements(form_record.schema->'fields')
        LOOP
            -- Check if field type is "datetime" and update to "datetime-local"
            IF field_record->>'type' = 'datetime' THEN
                field_record := jsonb_set(field_record, '{type}', '"datetime-local"');
            END IF;
            
            -- Add field to updated fields array
            updated_fields := updated_fields || field_record;
        END LOOP;
        
        -- Update the schema with new fields
        updated_schema := jsonb_set(form_record.schema, '{fields}', updated_fields);
        
        -- Update the database record
        UPDATE course_forms 
        SET schema = updated_schema 
        WHERE id = form_record.id;
    END LOOP;
    
    RAISE NOTICE 'Datetime field types have been updated to datetime-local';
END $$;
