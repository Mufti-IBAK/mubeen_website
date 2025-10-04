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

async function verifyRegistrationFlow() {
  console.log('🔍 VERIFYING REGISTRATION FLOW CONNECTION...\n');

  // Step 1: Get all programs
  const { data: programs, error: programsError } = await supabase
    .from('programs')
    .select('id, title, slug');
  
  if (programsError) {
    console.error('❌ Error fetching programs:', programsError);
    return;
  }

  if (!programs || programs.length === 0) {
    console.log('❌ No programs found. Cannot test registration flow.');
    return;
  }

  console.log(`✅ Found ${programs.length} program(s):`);
  programs.forEach(p => console.log(`   - ${p.title} (${p.slug}) [ID: ${p.id}]`));
  console.log('');

  // Step 2: For each program, verify the complete chain
  for (const program of programs) {
    console.log(`🔍 VERIFYING PROGRAM: ${program.title} (${program.slug})`);
    console.log(`   Program ID: ${program.id}`);

    // Check plans exist
    const { data: plans } = await supabase
      .from('program_plans')
      .select('id, plan_type, family_size, price, currency, duration_months')
      .eq('program_id', program.id);

    if (!plans || plans.length === 0) {
      console.log('   ❌ NO PLANS FOUND - Registration will not work');
      continue;
    }

    console.log(`   ✅ Found ${plans.length} plan(s):`);
    plans.forEach(plan => {
      if (plan.plan_type === 'individual') {
        console.log(`      - Individual: ${plan.currency} ${plan.price} (${plan.duration_months} months)`);
      } else {
        console.log(`      - Family of ${plan.family_size}: ${plan.currency} ${plan.price} (${plan.duration_months} months)`);
      }
    });

    // Check forms exist
    const { data: forms, count: formsCount } = await supabase
      .from('program_forms')
      .select('id, form_type, schema', { count: 'exact' })
      .eq('program_id', program.id);

    if (!formsCount || formsCount === 0) {
      console.log('   ❌ NO FORMS FOUND - Registration will not work');
      continue;
    }

    console.log(`   ✅ Found ${formsCount} form(s):`);
    forms.forEach(form => {
      const schema = form.schema;
      const fieldCount = schema && schema.fields ? schema.fields.length : 0;
      console.log(`      - ${form.form_type}: "${schema?.title || 'Untitled'}" (${fieldCount} fields)`);
    });

    // Check form completeness
    const hasIndividual = forms.some(f => f.form_type === 'individual');
    const hasFamilyHead = forms.some(f => f.form_type === 'family_head');
    const hasFamilyMember = forms.some(f => f.form_type === 'family_member');
    const hasIndividualPlan = plans.some(p => p.plan_type === 'individual');
    const hasFamilyPlan = plans.some(p => p.plan_type === 'family');

    console.log('   📋 REGISTRATION FLOW CHECKLIST:');
    console.log(`      Individual registration: ${hasIndividual && hasIndividualPlan ? '✅ READY' : '❌ MISSING'}`);
    console.log(`      Family registration: ${hasFamilyHead && hasFamilyMember && hasFamilyPlan ? '✅ READY' : '❌ MISSING'}`);

    // Test the actual registration URL
    console.log(`   🔗 Registration URL: /register?program=${program.slug}`);
    
    // Simulate the DynamicRegistrationFlow logic
    console.log('   🔄 SIMULATING REGISTRATION FLOW:');
    
    // 1. Program fetch by slug
    const { data: progBySlug } = await supabase
      .from('programs')
      .select('id, title, slug')
      .eq('slug', program.slug)
      .single();
    
    if (!progBySlug) {
      console.log('      ❌ Program not found by slug - routing will fail');
    } else {
      console.log('      ✅ Program found by slug');
    }

    // 2. Plans fetch
    const { data: plansForFlow } = await supabase
      .from('program_plans')
      .select('*')
      .eq('program_id', program.id);
    
    if (!plansForFlow || plansForFlow.length === 0) {
      console.log('      ❌ Plans not found - plan selection will fail');
    } else {
      console.log(`      ✅ Plans loaded for flow (${plansForFlow.length})`);
    }

    // 3. Forms count check (like in DynamicRegistrationFlow)
    const { count: flowFormsCount } = await supabase
      .from('program_forms')
      .select('id', { count: 'exact' })
      .eq('program_id', program.id);
    
    if (!flowFormsCount || flowFormsCount === 0) {
      console.log('      ❌ Forms count check fails - flow will show "not configured" message');
    } else {
      console.log(`      ✅ Forms count check passes (${flowFormsCount})`);
    }

    // 4. Individual form load test
    if (hasIndividual) {
      const { data: indivForm } = await supabase
        .from('program_forms')
        .select('schema')
        .eq('program_id', program.id)
        .eq('form_type', 'individual')
        .single();
      
      if (!indivForm?.schema) {
        console.log('      ❌ Individual form schema load fails');
      } else {
        console.log('      ✅ Individual form schema loads correctly');
      }
    }

    // 5. Family forms load test
    if (hasFamilyHead && hasFamilyMember) {
      const { data: headForm } = await supabase
        .from('program_forms')
        .select('schema')
        .eq('program_id', program.id)
        .eq('form_type', 'family_head')
        .single();
      
      const { data: memberForm } = await supabase
        .from('program_forms')
        .select('schema')
        .eq('program_id', program.id)
        .eq('form_type', 'family_member')
        .single();
      
      if (!headForm?.schema || !memberForm?.schema) {
        console.log('      ❌ Family forms schema load fails');
      } else {
        console.log('      ✅ Family forms schemas load correctly');
      }
    }

    console.log('   📊 FLOW CONCLUSION:');
    
    const canRegisterIndividual = hasIndividual && hasIndividualPlan && progBySlug && flowFormsCount > 0;
    const canRegisterFamily = hasFamilyHead && hasFamilyMember && hasFamilyPlan && progBySlug && flowFormsCount > 0;
    
    if (canRegisterIndividual || canRegisterFamily) {
      console.log(`      🎉 REGISTRATION FLOW IS WORKING for ${program.slug}`);
    } else {
      console.log(`      💥 REGISTRATION FLOW IS BROKEN for ${program.slug}`);
    }

    console.log('');
  }

  // Final Summary
  console.log('📈 OVERALL SUMMARY:');
  
  let workingPrograms = 0;
  let brokenPrograms = 0;
  
  for (const program of programs) {
    const { data: plans } = await supabase.from('program_plans').select('*').eq('program_id', program.id);
    const { data: forms, count: formsCount } = await supabase.from('program_forms').select('*', { count: 'exact' }).eq('program_id', program.id);
    
    const hasPlans = plans && plans.length > 0;
    const hasForms = formsCount && formsCount > 0;
    
    if (hasPlans && hasForms) {
      workingPrograms++;
    } else {
      brokenPrograms++;
    }
  }
  
  console.log(`✅ Working programs: ${workingPrograms}`);
  console.log(`❌ Broken programs: ${brokenPrograms}`);
  
  if (brokenPrograms > 0) {
    console.log('\n🔧 TO FIX BROKEN PROGRAMS:');
    console.log('1. Run the check-and-seed-forms.js script to add missing forms and plans');
    console.log('2. Or use the admin panel to create forms and plans for each program');
  }
}

async function main() {
  try {
    await verifyRegistrationFlow();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
