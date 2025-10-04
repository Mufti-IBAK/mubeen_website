const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local if it exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  const envVars = envFile.split('\n').filter(line => line.includes('=') && !line.trim().startsWith('#')).reduce((acc, line) => {
    const [key, ...values] = line.split('=');
    let value = values.join('=').trim();
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    acc[key.trim()] = value;
    return acc;
  }, {});
  Object.assign(process.env, envVars);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndSeedForms() {
  console.log('Checking program forms...');

  // Check if there are any programs
  const { data: programs, error: programsError } = await supabase
    .from('programs')
    .select('id, title, slug');
  
  if (programsError) {
    console.error('Error fetching programs:', programsError);
    return;
  }

  if (!programs || programs.length === 0) {
    console.log('No programs found. Please add programs first.');
    return;
  }

  console.log(`Found ${programs.length} program(s):`, programs.map(p => `${p.title} (${p.slug})`));

  // Check existing forms
  const { data: forms, error: formsError } = await supabase
    .from('program_forms')
    .select('id, program_id, form_type');

  if (formsError) {
    console.error('Error fetching forms:', formsError);
    return;
  }

  console.log(`Found ${forms?.length || 0} existing form(s)`);

  // Check which programs need forms
  const programsNeedingForms = [];
  for (const program of programs) {
    const programForms = forms?.filter(f => f.program_id === program.id) || [];
    const hasIndividual = programForms.some(f => f.form_type === 'individual');
    const hasFamilyHead = programForms.some(f => f.form_type === 'family_head');
    const hasFamilyMember = programForms.some(f => f.form_type === 'family_member');
    
    if (!hasIndividual || !hasFamilyHead || !hasFamilyMember) {
      programsNeedingForms.push({
        ...program,
        needsIndividual: !hasIndividual,
        needsFamilyHead: !hasFamilyHead,
        needsFamilyMember: !hasFamilyMember
      });
    }
  }

  if (programsNeedingForms.length === 0) {
    console.log('✅ All programs have complete form sets');
    return;
  }

  console.log(`🔧 ${programsNeedingForms.length} program(s) need forms. Seeding...`);

  // Seed forms for programs that need them
  for (const program of programsNeedingForms) {
    console.log(`Seeding forms for: ${program.title}`);

    const formsToCreate = [];

    // Individual form
    if (program.needsIndividual) {
      formsToCreate.push({
        program_id: program.id,
        form_type: 'individual',
        schema: {
          title: 'Individual Registration',
          description: 'Provide your details to register for the program.',
          fields: [
            { id: 'sec1', type: 'section', label: 'Personal Information', description: 'Your personal details' },
            { id: 'full_name', type: 'text', label: 'Full Name', required: true },
            { id: 'email', type: 'email', label: 'Email', required: true },
            { id: 'phone', type: 'tel', label: 'Phone Number', required: true },
            { id: 'dob', type: 'date', label: 'Date of Birth', required: true },
            { id: 'goals', type: 'textarea', label: 'Primary Goals', description: 'What would you like to achieve in this program?' },
            { id: 'session_pref', type: 'select', label: 'Session Preference', options: ['Live', 'Recorded', 'Both'] },
            { id: 'consent', type: 'checkbox', label: 'Consents', options: ['I agree to the terms', 'I consent to receive communications'] }
          ]
        }
      });
    }

    // Family head form
    if (program.needsFamilyHead) {
      formsToCreate.push({
        program_id: program.id,
        form_type: 'family_head',
        schema: {
          title: 'Family Registration - Head',
          description: 'Provide the primary payer/guardian information.',
          fields: [
            { id: 'sec1', type: 'section', label: 'Head of Family', description: 'Details of the person paying/managing the registration' },
            { id: 'head_full_name', type: 'text', label: 'Full Name', required: true },
            { id: 'head_email', type: 'email', label: 'Email', required: true },
            { id: 'head_phone', type: 'tel', label: 'Phone Number', required: true },
            { id: 'family_start', type: 'datetime-local', label: 'Preferred Start Date & Time', required: false },
            { id: 'notes', type: 'textarea', label: 'Notes for the Academy' }
          ]
        }
      });
    }

    // Family member form
    if (program.needsFamilyMember) {
      formsToCreate.push({
        program_id: program.id,
        form_type: 'family_member',
        schema: {
          title: 'Family Registration - Member',
          description: 'Provide each member details. You will be prompted per member.',
          fields: [
            { id: 'sec1', type: 'section', label: 'Member Details', description: 'Fill for each family member' },
            { id: 'member_full_name', type: 'text', label: 'Full Name', required: true },
            { id: 'member_email', type: 'email', label: 'Email' },
            { id: 'member_dob', type: 'date', label: 'Date of Birth' },
            { id: 'member_level', type: 'select', label: 'Knowledge Level', options: ['Beginner', 'Intermediate', 'Advanced'] }
          ]
        }
      });
    }

    // Insert forms
    if (formsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('program_forms')
        .insert(formsToCreate);

      if (insertError) {
        console.error(`Error inserting forms for ${program.title}:`, insertError);
      } else {
        console.log(`✅ Created ${formsToCreate.length} form(s) for ${program.title}`);
      }
    }
  }

  console.log('✅ Form seeding complete!');
}

// Also check and seed program plans if missing
async function checkAndSeedPlans() {
  console.log('Checking program plans...');
  
  const { data: programs } = await supabase
    .from('programs')
    .select('id, title, slug');

  if (!programs?.length) return;

  const { data: plans } = await supabase
    .from('program_plans')
    .select('id, program_id, plan_type, family_size, price');

  console.log(`Found ${plans?.length || 0} existing plan(s)`);

  const programsNeedingPlans = [];
  for (const program of programs) {
    const programPlans = plans?.filter(p => p.program_id === program.id) || [];
    const hasIndividual = programPlans.some(p => p.plan_type === 'individual');
    const hasFamily = programPlans.some(p => p.plan_type === 'family');
    
    if (!hasIndividual || !hasFamily) {
      programsNeedingPlans.push({
        ...program,
        needsIndividual: !hasIndividual,
        needsFamily: !hasFamily
      });
    }
  }

  if (programsNeedingPlans.length === 0) {
    console.log('✅ All programs have plans');
    return;
  }

  console.log(`🔧 ${programsNeedingPlans.length} program(s) need plans. Seeding...`);

  for (const program of programsNeedingPlans) {
    const plansToCreate = [];

    if (program.needsIndividual) {
      plansToCreate.push({
        program_id: program.id,
        plan_type: 'individual',
        family_size: null,
        price: 25000,
        currency: 'NGN',
        duration_months: 3
      });
    }

    if (program.needsFamily) {
      plansToCreate.push(
        {
          program_id: program.id,
          plan_type: 'family',
          family_size: 2,
          price: 45000,
          currency: 'NGN',
          duration_months: 3
        },
        {
          program_id: program.id,
          plan_type: 'family',
          family_size: 3,
          price: 60000,
          currency: 'NGN',
          duration_months: 3
        },
        {
          program_id: program.id,
          plan_type: 'family',
          family_size: 4,
          price: 75000,
          currency: 'NGN',
          duration_months: 3
        }
      );
    }

    if (plansToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('program_plans')
        .insert(plansToCreate);

      if (insertError) {
        console.error(`Error inserting plans for ${program.title}:`, insertError);
      } else {
        console.log(`✅ Created ${plansToCreate.length} plan(s) for ${program.title}`);
      }
    }
  }

  console.log('✅ Plan seeding complete!');
}

async function main() {
  try {
    await checkAndSeedPlans();
    await checkAndSeedForms();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
