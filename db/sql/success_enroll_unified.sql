-- Ensure success_enroll supports unified individual registrations
BEGIN;

-- Columns for unified flow (idempotent)
ALTER TABLE public.success_enroll ADD COLUMN IF NOT EXISTS registration_mode text;
ALTER TABLE public.success_enroll ADD COLUMN IF NOT EXISTS participants_count integer;
ALTER TABLE public.success_enroll ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]'::jsonb;

-- Defaults for individual-only
UPDATE public.success_enroll
SET registration_mode = COALESCE(registration_mode, 'solo'),
    participants_count = COALESCE(participants_count, 1)
WHERE type = 'program';

-- Optional: drop legacy category column
-- ALTER TABLE public.success_enroll DROP COLUMN IF EXISTS category;

COMMIT;
