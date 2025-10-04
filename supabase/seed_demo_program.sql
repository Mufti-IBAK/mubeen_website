-- Seed demo program, plans, and forms for quick testing
-- Run this in Supabase SQL Editor

-- 1) Create a demo program if not exists
insert into programs (title, slug, description, image_url, duration, tags, is_flagship, level, language, start_date, enrollment_deadline)
values (
  'Islamic Foundations Program',
  'islamic-foundations-program',
  'A foundational program covering Qur''an, Hadith, and Aqeedah.',
  'https://images.pexels.com/photos/159711/book-open-pages-literature-159711.jpeg',
  '3 months',
  array['Qur''an','Hadith','Aqeedah'],
  true,
  'Beginner',
  'English',
  (now() + interval '7 day')::date,
  (now() + interval '20 day')::date
)
on conflict (slug) do nothing;

-- If your Postgres doesn''t support `into` in SQL editor, select the id separately:
-- select id from programs where slug = 'islamic-foundations-program';
-- Then manually replace the placeholder below.

-- For SQL Editor compatibility, we’ll fallback to a DO block to fetch the program id and seed records idempotently.
DO $$
DECLARE
  demo_id integer;
BEGIN
  SELECT id INTO demo_id FROM programs WHERE slug = 'islamic-foundations-program';
  IF demo_id IS NULL THEN
    RAISE NOTICE 'Demo program not found - please run the insert above first.';
    RETURN;
  END IF;

  -- 2) Seed program plans (individual and family sizes)
  -- Uses a simple table name program_plans with columns: id, program_id, plan_type, family_size, price, currency, duration_months
  -- Adjust column names if your schema differs.
  INSERT INTO program_plans (program_id, plan_type, family_size, price, currency, duration_months)
  VALUES
    (demo_id, 'individual', NULL, 25000, 'NGN', 3),
    (demo_id, 'family', 2, 45000, 'NGN', 3),
    (demo_id, 'family', 3, 60000, 'NGN', 3),
    (demo_id, 'family', 4, 75000, 'NGN', 3)
  ON CONFLICT DO NOTHING;

  -- 3) Seed program forms
  -- Table: program_forms (program_id, form_type, schema)
  -- Form types: 'individual', 'family_head', 'family_member'

  -- Individual form schema
  INSERT INTO program_forms (program_id, form_type, schema)
  VALUES (
    demo_id,
    'individual',
    jsonb_build_object(
      'title', 'Individual Registration',
      'description', 'Provide your details to register for the program.',
      'fields', jsonb_build_array(
        jsonb_build_object('id','sec1','type','section','label','Personal Information','description','Your personal details'),
        jsonb_build_object('id','full_name','type','text','label','Full Name','required',true),
        jsonb_build_object('id','email','type','email','label','Email','required',true),
        jsonb_build_object('id','phone','type','tel','label','Phone Number','required',true),
        jsonb_build_object('id','dob','type','date','label','Date of Birth','required',true),
        jsonb_build_object('id','goals','type','textarea','label','Primary Goals','description','What would you like to achieve in this program?'),
        jsonb_build_object('id','session_pref','type','select','label','Session Preference','options', jsonb_build_array('Live','Recorded','Both')),
        jsonb_build_object('id','consent','type','checkbox','label','Consents','options', jsonb_build_array('I agree to the terms','I consent to receive communications'))
      )
    )
  ) ON CONFLICT DO NOTHING;

  -- Family head form schema
  INSERT INTO program_forms (program_id, form_type, schema)
  VALUES (
    demo_id,
    'family_head',
    jsonb_build_object(
      'title', 'Family Registration - Head',
      'description', 'Provide the primary payer/guardian information.',
      'fields', jsonb_build_array(
        jsonb_build_object('id','sec1','type','section','label','Head of Family','description','Details of the person paying/managing the registration'),
        jsonb_build_object('id','head_full_name','type','text','label','Full Name','required',true),
        jsonb_build_object('id','head_email','type','email','label','Email','required',true),
        jsonb_build_object('id','head_phone','type','tel','label','Phone Number','required',true),
        jsonb_build_object('id','family_start','type','datetime','label','Preferred Start Date & Time','required',false),
        jsonb_build_object('id','notes','type','textarea','label','Notes for the Academy')
      )
    )
  ) ON CONFLICT DO NOTHING;

  -- Family member form schema
  INSERT INTO program_forms (program_id, form_type, schema)
  VALUES (
    demo_id,
    'family_member',
    jsonb_build_object(
      'title', 'Family Registration - Member',
      'description', 'Provide each member details. You will be prompted per member.',
      'fields', jsonb_build_array(
        jsonb_build_object('id','sec1','type','section','label','Member Details','description','Fill for each family member'),
        jsonb_build_object('id','member_full_name','type','text','label','Full Name','required',true),
        jsonb_build_object('id','member_email','type','email','label','Email'),
        jsonb_build_object('id','member_dob','type','date','label','Date of Birth'),
        jsonb_build_object('id','member_level','type','select','label','Knowledge Level','options', jsonb_build_array('Beginner','Intermediate','Advanced'))
      )
    )
  ) ON CONFLICT DO NOTHING;
END $$;

