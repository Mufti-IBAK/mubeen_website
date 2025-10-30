-- ============================================================================
-- DATABASE CLEANUP: Remove old registration and enrollment features
-- ============================================================================
-- This script removes all tables and data related to the old registration/
-- enrollment workflow that has been deprecated.
--
-- WARNING: This will permanently delete all data in these tables!
-- Make a backup before running.

-- Drop dependent views first (if any exist)
DROP VIEW IF EXISTS enrollment_summary CASCADE;

-- Drop enrollment-related tables
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS registration_drafts CASCADE;

-- Remove enrollment-related columns from other tables if they exist
-- (These are optional depending on your schema)
ALTER TABLE programs DROP COLUMN IF EXISTS enrollment_limit CASCADE;
ALTER TABLE programs DROP COLUMN IF EXISTS enrollment_count CASCADE;

-- ============================================================================
-- End of cleanup. All old registration/enrollment data has been removed.
-- ============================================================================
