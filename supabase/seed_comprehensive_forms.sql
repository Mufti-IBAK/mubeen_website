-- Comprehensive Form Seeding Script
-- This replaces all existing forms with rich, comprehensive forms that showcase all field types
-- Run this in Supabase SQL Editor

-- Clear existing forms first
DELETE FROM program_forms;

-- Get all program IDs for seeding
DO $$
DECLARE
    prog_record RECORD;
    individual_schema JSONB;
    family_head_schema JSONB;
    family_member_schema JSONB;
BEGIN
    -- Loop through all programs and create comprehensive forms
    FOR prog_record IN 
        SELECT id::bigint as id, title FROM programs ORDER BY id
    LOOP
        RAISE NOTICE 'Creating comprehensive forms for program: %', prog_record.title;
        
        -- INDIVIDUAL FORM - Comprehensive with all field types
        individual_schema := jsonb_build_object(
            'title', prog_record.title || ' - Individual Registration',
            'description', 'Please fill out all sections completely. You can save your progress and continue later.',
            'fields', jsonb_build_array(
                -- SECTION 1: Personal Information
                jsonb_build_object(
                    'id', 'personal_section',
                    'type', 'section',
                    'label', '📋 Personal Information',
                    'description', 'Tell us about yourself - this information helps us provide the best learning experience.'
                ),
                jsonb_build_object(
                    'id', 'full_name',
                    'type', 'text',
                    'label', 'Full Name',
                    'description', 'Enter your complete legal name as it appears on official documents',
                    'required', true,
                    'style', jsonb_build_object('bold', true)
                ),
                jsonb_build_object(
                    'id', 'email',
                    'type', 'email',
                    'label', 'Email Address',
                    'description', 'We''ll use this email for all course communications',
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'phone',
                    'type', 'tel',
                    'label', 'Phone Number',
                    'description', 'Include country code (e.g., +1234567890)',
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'date_of_birth',
                    'type', 'date',
                    'label', 'Date of Birth',
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'gender',
                    'type', 'radio',
                    'label', 'Gender',
                    'options', jsonb_build_array('Male', 'Female', 'Prefer not to say'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'country',
                    'type', 'select',
                    'label', 'Country of Residence',
                    'options', jsonb_build_array('Nigeria', 'United States', 'United Kingdom', 'Canada', 'Australia', 'South Africa', 'Ghana', 'Kenya', 'Other'),
                    'required', true
                ),
                
                -- SECTION 2: Educational Background & Goals
                jsonb_build_object(
                    'id', 'education_section',
                    'type', 'section',
                    'label', '🎓 Educational Background & Learning Goals',
                    'description', 'Help us understand your educational background and what you hope to achieve.'
                ),
                jsonb_build_object(
                    'id', 'education_level',
                    'type', 'select',
                    'label', 'Highest Education Level',
                    'options', jsonb_build_array('High School', 'Bachelor''s Degree', 'Master''s Degree', 'PhD', 'Islamic Studies Degree', 'Other'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'islamic_knowledge',
                    'type', 'radio',
                    'label', 'Current Islamic Knowledge Level',
                    'options', jsonb_build_array('Beginner', 'Intermediate', 'Advanced'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'arabic_level',
                    'type', 'radio',
                    'label', 'Arabic Language Level',
                    'options', jsonb_build_array('None', 'Basic', 'Intermediate', 'Advanced', 'Native'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'learning_goals',
                    'type', 'textarea',
                    'label', 'Learning Goals',
                    'description', 'What specific goals do you hope to achieve through this program? (minimum 50 words)',
                    'required', true,
                    'style', jsonb_build_object('bold', true)
                ),
                jsonb_build_object(
                    'id', 'study_time',
                    'type', 'select',
                    'label', 'Available Study Time per Week',
                    'options', jsonb_build_array('Less than 5 hours', '5-10 hours', '10-15 hours', '15-20 hours', 'More than 20 hours'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'preferred_schedule',
                    'type', 'checkbox',
                    'label', 'Preferred Class Times (select all that apply)',
                    'options', jsonb_build_array('Morning (6-10 AM)', 'Midday (10-2 PM)', 'Afternoon (2-6 PM)', 'Evening (6-10 PM)', 'Weekend Only'),
                    'required', true
                ),
                
                -- SECTION 3: Technical & Additional Information  
                jsonb_build_object(
                    'id', 'technical_section',
                    'type', 'section',
                    'label', '💻 Technical Requirements & Additional Information',
                    'description', 'Final details to ensure the best learning experience.'
                ),
                jsonb_build_object(
                    'id', 'device_access',
                    'type', 'checkbox',
                    'label', 'Available Devices (select all that apply)',
                    'options', jsonb_build_array('Computer/Laptop', 'Tablet', 'Smartphone', 'Stable Internet Connection'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'preferred_start',
                    'type', 'datetime-local',
                    'label', 'Preferred Start Date & Time',
                    'description', 'When would you like to begin the program?'
                ),
                jsonb_build_object(
                    'id', 'emergency_contact',
                    'type', 'text',
                    'label', 'Emergency Contact Name & Phone',
                    'description', 'Name and phone number of someone we can contact if needed'
                ),
                jsonb_build_object(
                    'id', 'medical_considerations',
                    'type', 'textarea',
                    'label', 'Medical/Learning Considerations',
                    'description', 'Any medical conditions, learning disabilities, or accommodations we should be aware of? (Optional)'
                ),
                jsonb_build_object(
                    'id', 'photo_upload',
                    'type', 'file',
                    'label', 'Profile Photo',
                    'description', 'Upload a recent photo for your student profile (optional)'
                ),
                jsonb_build_object(
                    'id', 'referral_source',
                    'type', 'select',
                    'label', 'How did you hear about us?',
                    'options', jsonb_build_array('Social Media', 'Friend/Family', 'Google Search', 'Islamic Website', 'Masjid/Community', 'Advertisement', 'Other')
                ),
                jsonb_build_object(
                    'id', 'agreements',
                    'type', 'checkbox',
                    'label', 'Required Agreements',
                    'options', jsonb_build_array(
                        'I agree to the Terms & Conditions',
                        'I agree to the Privacy Policy', 
                        'I consent to receive course communications',
                        'I understand the refund policy',
                        'I commit to attending classes regularly'
                    ),
                    'required', true,
                    'style', jsonb_build_object('bold', true)
                )
            )
        );
        
        -- FAMILY HEAD FORM - Comprehensive family coordinator info
        family_head_schema := jsonb_build_object(
            'title', prog_record.title || ' - Family Head Registration',
            'description', 'As the family head, please provide your information and family details. You''ll manage payment and coordination for all family members.',
            'fields', jsonb_build_array(
                -- SECTION 1: Head Information
                jsonb_build_object(
                    'id', 'head_section',
                    'type', 'section',
                    'label', '👤 Family Head Information',
                    'description', 'Your information as the primary contact and payment responsible person.'
                ),
                jsonb_build_object(
                    'id', 'head_full_name',
                    'type', 'text',
                    'label', 'Full Name (Family Head)',
                    'required', true,
                    'style', jsonb_build_object('bold', true)
                ),
                jsonb_build_object(
                    'id', 'head_email',
                    'type', 'email',
                    'label', 'Email Address',
                    'description', 'Primary email for family communications and receipts',
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'head_phone',
                    'type', 'tel',
                    'label', 'Phone Number',
                    'description', 'Primary contact number with country code',
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'relationship_to_members',
                    'type', 'select',
                    'label', 'Relationship to Family Members',
                    'options', jsonb_build_array('Parent', 'Guardian', 'Spouse', 'Sibling', 'Other Relative'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'payment_method',
                    'type', 'radio',
                    'label', 'Preferred Payment Method',
                    'options', jsonb_build_array('Credit/Debit Card', 'Bank Transfer', 'Mobile Money', 'Installments'),
                    'required', true
                ),
                
                -- SECTION 2: Family Planning & Coordination
                jsonb_build_object(
                    'id', 'coordination_section',
                    'type', 'section',
                    'label', '👨‍👩‍👧‍👦 Family Learning Coordination',
                    'description', 'Help us understand how to best coordinate learning for your family.'
                ),
                jsonb_build_object(
                    'id', 'family_learning_goals',
                    'type', 'textarea',
                    'label', 'Family Learning Goals',
                    'description', 'What do you hope to achieve as a family through this program?',
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'study_space',
                    'type', 'radio',
                    'label', 'Family Study Arrangement',
                    'options', jsonb_build_array('Together in same room', 'Separate rooms/devices', 'Mixed arrangement'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'family_schedule_pref',
                    'type', 'select',
                    'label', 'Preferred Family Class Schedule',
                    'options', jsonb_build_array('All same time', 'Different times', 'Weekend focus', 'Flexible'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'preferred_start_date',
                    'type', 'datetime-local',
                    'label', 'Preferred Family Start Date & Time',
                    'description', 'When would your family like to begin the program?'
                ),
                jsonb_build_object(
                    'id', 'special_requests',
                    'type', 'textarea',
                    'label', 'Special Requests or Considerations',
                    'description', 'Any specific needs, accommodations, or requests for your family?'
                ),
                jsonb_build_object(
                    'id', 'emergency_contact',
                    'type', 'text',
                    'label', 'Family Emergency Contact',
                    'description', 'Alternative contact person (name and phone)',
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'head_agreements',
                    'type', 'checkbox',
                    'label', 'Family Head Agreements',
                    'options', jsonb_build_array(
                        'I agree to coordinate family participation',
                        'I take responsibility for family payments',
                        'I will ensure all family members follow course guidelines',
                        'I agree to the Terms & Conditions on behalf of my family',
                        'I consent to family communication via provided contact details'
                    ),
                    'required', true,
                    'style', jsonb_build_object('bold', true)
                )
            )
        );
        
        -- FAMILY MEMBER FORM - Individual member details
        family_member_schema := jsonb_build_object(
            'title', prog_record.title || ' - Family Member Details',
            'description', 'Please provide details for each family member participating in the program.',
            'fields', jsonb_build_array(
                -- SECTION 1: Member Basic Info
                jsonb_build_object(
                    'id', 'member_basic_section',
                    'type', 'section',
                    'label', '🧑 Family Member Information',
                    'description', 'Basic information about this family member.'
                ),
                jsonb_build_object(
                    'id', 'member_full_name',
                    'type', 'text',
                    'label', 'Full Name',
                    'required', true,
                    'style', jsonb_build_object('bold', true)
                ),
                jsonb_build_object(
                    'id', 'member_age',
                    'type', 'number',
                    'label', 'Age',
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'member_date_of_birth',
                    'type', 'date',
                    'label', 'Date of Birth',
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'member_gender',
                    'type', 'radio',
                    'label', 'Gender',
                    'options', jsonb_build_array('Male', 'Female'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'relationship_to_head',
                    'type', 'select',
                    'label', 'Relationship to Family Head',
                    'options', jsonb_build_array('Child', 'Spouse', 'Sibling', 'Parent', 'Other Relative'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'member_email',
                    'type', 'email',
                    'label', 'Email Address (if different from family head)',
                    'description', 'Optional - leave blank to use family head email'
                ),
                
                -- SECTION 2: Learning Profile
                jsonb_build_object(
                    'id', 'member_learning_section',
                    'type', 'section',
                    'label', '📚 Learning Profile',
                    'description', 'Information about this member''s educational background and learning needs.'
                ),
                jsonb_build_object(
                    'id', 'member_education_level',
                    'type', 'select',
                    'label', 'Education Level',
                    'options', jsonb_build_array('Elementary', 'Middle School', 'High School', 'University Student', 'Graduate', 'Adult Learner'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'member_islamic_knowledge',
                    'type', 'radio',
                    'label', 'Islamic Knowledge Level',
                    'options', jsonb_build_array('Beginner', 'Intermediate', 'Advanced'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'member_arabic_level',
                    'type', 'radio',
                    'label', 'Arabic Reading Level',
                    'options', jsonb_build_array('Cannot read', 'Basic reading', 'Intermediate', 'Advanced'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'member_learning_style',
                    'type', 'checkbox',
                    'label', 'Learning Preferences (select all that apply)',
                    'options', jsonb_build_array('Visual learner', 'Audio learner', 'Hands-on learner', 'Group discussion', 'Independent study')
                ),
                jsonb_build_object(
                    'id', 'member_goals',
                    'type', 'textarea',
                    'label', 'Personal Learning Goals',
                    'description', 'What does this family member hope to learn or achieve?'
                ),
                jsonb_build_object(
                    'id', 'member_schedule_availability',
                    'type', 'checkbox',
                    'label', 'Available Times for Classes',
                    'options', jsonb_build_array('Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Saturday', 'Sunday'),
                    'required', true
                ),
                jsonb_build_object(
                    'id', 'member_special_needs',
                    'type', 'textarea',
                    'label', 'Special Needs or Accommodations',
                    'description', 'Any learning difficulties, medical conditions, or accommodations needed? (Optional)'
                ),
                jsonb_build_object(
                    'id', 'member_photo',
                    'type', 'file',
                    'label', 'Member Photo',
                    'description', 'Upload a photo for this family member''s profile (optional)'
                )
            )
        );
        
        -- Insert the comprehensive forms
        INSERT INTO program_forms (program_id, form_type, schema) VALUES
            (prog_record.id, 'individual', individual_schema),
            (prog_record.id, 'family_head', family_head_schema),
            (prog_record.id, 'family_member', family_member_schema);
            
        RAISE NOTICE 'Completed forms for program ID: %', prog_record.id;
    END LOOP;
    
    RAISE NOTICE 'All comprehensive forms have been created successfully!';
END $$;
