-- Seed Individual-Only Comprehensive Registration Form for all programs
BEGIN;

-- 0) Remove existing forms (optional)
DELETE FROM public.program_forms;

-- 1) Ensure enum and table exist (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_type') THEN
    CREATE TYPE form_type AS ENUM ('individual', 'family_head', 'family_member');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.program_forms (
  id bigserial PRIMARY KEY,
  program_id bigint NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  form_type form_type NOT NULL,
  schema jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS program_forms_unique ON public.program_forms(program_id, form_type);

-- 2) Seed individual form for each program
DO $$
DECLARE
  prog RECORD;
  individual_schema JSONB;
BEGIN
  FOR prog IN SELECT id, title FROM public.programs LOOP
    individual_schema := jsonb_build_object(
      'title', prog.title || ' - Registration',
      'description', 'Please fill out all sections completely. You can save your progress and continue later.',
      'fields', jsonb_build_array(
        -- Section 1
        jsonb_build_object('id','personal','type','section','label','📋 Personal Information','description','Your basic personal details.'),
        jsonb_build_object('id','full_name','type','text','label','Full Name','required',true,'style', jsonb_build_object('bold', true)),
        jsonb_build_object('id','email','type','email','label','Email Address','required',true),
        jsonb_build_object('id','phone','type','tel','label','Phone Number','required',true,'description','Include country code'),
        jsonb_build_object('id','date_of_birth','type','date','label','Date of Birth','required',true),
        jsonb_build_object('id','gender','type','radio','label','Gender','options',jsonb_build_array('Male','Female','Prefer not to say'),'required',true),
        jsonb_build_object('id','country','type','select','label','Country of Residence','options', jsonb_build_array('Nigeria','United States','United Kingdom','Canada','Australia','South Africa','Ghana','Kenya','Other'),'required',true),
        -- Section 2
        jsonb_build_object('id','education','type','section','label','🎓 Education & Goals','description','Background and goals'),
        jsonb_build_object('id','education_level','type','select','label','Highest Education Level','options', jsonb_build_array('High School','Bachelor''s Degree','Master''s Degree','PhD','Islamic Studies Degree','Other'),'required',true),
        jsonb_build_object('id','islamic_knowledge','type','radio','label','Current Islamic Knowledge Level','options', jsonb_build_array('Beginner','Intermediate','Advanced'),'required',true),
        jsonb_build_object('id','arabic_level','type','radio','label','Arabic Language Level','options', jsonb_build_array('None','Basic','Intermediate','Advanced','Native'),'required',true),
        jsonb_build_object('id','learning_goals','type','textarea','label','Learning Goals','description','Minimum 50 words','required',true,'style',jsonb_build_object('bold', true)),
        jsonb_build_object('id','study_time','type','select','label','Available Study Time per Week','options', jsonb_build_array('Less than 5 hours','5-10 hours','10-15 hours','15-20 hours','More than 20 hours'),'required',true),
        jsonb_build_object('id','preferred_schedule','type','checkbox','label','Preferred Class Times','options', jsonb_build_array('Morning (6-10 AM)','Midday (10-2 PM)','Afternoon (2-6 PM)','Evening (6-10 PM)','Weekend Only'),'required',true),
        -- Section 3
        jsonb_build_object('id','tech','type','section','label','💻 Technical & Additional Information','description','Final details'),
        jsonb_build_object('id','device_access','type','checkbox','label','Available Devices','options', jsonb_build_array('Computer/Laptop','Tablet','Smartphone','Stable Internet Connection'),'required',true),
        jsonb_build_object('id','preferred_start','type','datetime-local','label','Preferred Start Date & Time'),
        jsonb_build_object('id','emergency_contact','type','text','label','Emergency Contact (Name & Phone)'),
        jsonb_build_object('id','medical_considerations','type','textarea','label','Medical/Learning Considerations'),
        jsonb_build_object('id','photo_upload','type','file','label','Profile Photo'),
        jsonb_build_object('id','referral_source','type','select','label','How did you hear about us?','options', jsonb_build_array('Social Media','Friend/Family','Google Search','Islamic Website','Masjid/Community','Advertisement','Other')),
        jsonb_build_object('id','agreements','type','checkbox','label','Required Agreements','options', jsonb_build_array('I agree to the Terms & Conditions','I agree to the Privacy Policy','I consent to receive course communications','I understand the refund policy','I commit to attending classes regularly'),'required',true,'style', jsonb_build_object('bold', true))
      )
    );

    INSERT INTO public.program_forms(program_id, form_type, schema)
    VALUES (prog.id, 'individual', individual_schema)
    ON CONFLICT (program_id, form_type) DO UPDATE SET schema = EXCLUDED.schema;
  END LOOP;
END $$;

COMMIT;

-- 3) Plans: remove family plans and keep only individual per program
DELETE FROM public.program_plans WHERE plan_type = 'family' OR family_size IS NOT NULL;
