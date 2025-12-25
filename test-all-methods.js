const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const path = require('path');

// Load env vars
try {
  const envPath = path.resolve(__dirname, '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
} catch (e) {
  console.log('Could not read .env.local', e.message);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAllMethods() {
  console.log("=== Testing All Three Verification Methods ===\n");

  // Get a test enrollment with tx_ref
  const { data: testEnrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('payment_status', 'unpaid')
    .not('tx_ref', 'is', null)
    .limit(1)
    .single();

  if (!testEnrollment) {
    console.log("No unpaid enrollments with tx_ref found for testing");
    return;
  }

  console.log(`Testing with Enrollment #${testEnrollment.id}`);
  console.log(`TX Ref: ${testEnrollment.tx_ref}`);
  console.log(`Email: ${testEnrollment.user_email}\n`);

  // Method 1: Strategic Verify (via API)
  console.log("[1] Testing Strategic Verify (API call)...");
  try {
    const res = await fetch(`http://localhost:3000/api/payments/verify?tx_ref=${testEnrollment.tx_ref}`);
    const json = await res.json();
    console.log("   Status:", res.status);
    console.log("   Response:", JSON.stringify(json, null, 2));
    
    if (json.ok) {
      // Check if database was updated
      const { data: updated } = await supabase
        .from('enrollments')
        .select('payment_status, status')
        .eq('id', testEnrollment.id)
        .single();
      console.log("   ✅ Database status:", updated);
    }
  } catch (e) {
    console.error("   ❌ Error:", e.message);
  }

  // Method 2: Manual Override (API call)
  console.log("\n[2] Testing Manual Override (API call)...");
  
  // First reset the enrollment
  await supabase
    .from('enrollments')
    .update({ payment_status: 'unpaid', status: 'pending' })
    .eq('id', testEnrollment.id);

  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;

    const res = await fetch(`http://localhost:3000/api/admin/enrollments/${testEnrollment.id}/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        payment_status: 'paid',
        status: 'active',
        tx_ref: testEnrollment.tx_ref || `MANUAL-${Date.now()}`,
        transaction_id: testEnrollment.transaction_id || `MANUAL-${Date.now()}`
      })
    });

    const json = await res.json();
    console.log("   Status:", res.status);
    console.log("   Response:", JSON.stringify(json, null, 2));

    if (json.ok) {
      const { data: updated } = await supabase
        .from('enrollments')
        .select('payment_status, status')
        .eq('id', testEnrollment.id)
        .single();
      console.log("   ✅ Database status:", updated);
    }
  } catch (e) {
    console.error("   ❌ Error:", e.message);
  }

  // Method 3: Auto-Recovery (email search)
  console.log("\n[3] Testing Auto-Recovery (email search)...");
  
  // Reset again
  await supabase
    .from('enrollments')
    .update({ payment_status: 'unpaid', status: 'pending' })
    .eq('id', testEnrollment.id);

  try {
    const res = await fetch(`http://localhost:3000/api/payments/verify?id=${testEnrollment.id}`);
    const json = await res.json();
    console.log("   Status:", res.status);
    console.log("   Response:", JSON.stringify(json, null, 2));

    if (json.ok) {
      const { data: updated } = await supabase
        .from('enrollments')
        .select('payment_status, status')
        .eq('id', testEnrollment.id)
        .single();
      console.log("   ✅ Database status:", updated);
    }
  } catch (e) {
    console.error("   ❌ Error:", e.message);
  }

  console.log("\n=== Test Complete ===");
}

testAllMethods().catch(console.error);
