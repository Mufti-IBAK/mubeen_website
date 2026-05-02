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

const FLW_SK = process.env.FLUTTERWAVE_SECRET_KEY;

async function testVerification() {
  console.log("=== Testing Flutterwave Verification ===\n");

  const tx_ref = "se-30-1764922786241";
  const tx_id = "1932340822";

  // Test 1: Verify by reference
  console.log("[1] Testing verification by tx_ref:", tx_ref);
  try {
    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(tx_ref)}`,
      { headers: { Authorization: `Bearer ${FLW_SK}` } }
    );
    
    const json = await res.json();
    console.log("   Status:", res.status);
    console.log("   Response:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("   ❌ Error:", e.message);
  }

  // Test 2: Verify by ID
  console.log("\n[2] Testing verification by transaction ID:", tx_id);
  try {
    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/${tx_id}/verify`,
      { headers: { Authorization: `Bearer ${FLW_SK}` } }
    );
    
    const json = await res.json();
    console.log("   Status:", res.status);
    console.log("   Response:", JSON.stringify(json, null, 2));
  } catch (e) {
    console.error("   ❌ Error:", e.message);
  }

  // Test 3: Manual Override simulation
  console.log("\n[3] Testing Manual Override (DB update)...");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase
    .from('enrollments')
    .update({
      payment_status: 'paid',
      status: 'active',
      tx_ref: tx_ref || `MANUAL-${Date.now()}`,
      transaction_id: tx_id || `MANUAL-ADMIN-${Date.now()}`
    })
    .eq('id', 113);

  if (error) {
    console.error("   ❌ Update failed:", error.message);
    console.error("   Details:", error);
  } else {
    console.log("   ✅ Update successful!");
    
    // Verify the update
    const { data } = await supabase
      .from('enrollments')
      .select('payment_status, status')
      .eq('id', 113)
      .single();
    
    console.log("   New status:", data);
  }
}

testVerification().catch(console.error);
