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

async function diagnose() {
  console.log("=== Diagnosing Enrollment #113 ===\n");

  // 1. Check enrollment data
  console.log("[1] Fetching enrollment #113...");
  const { data: enrollment, error: enrollErr } = await supabase
    .from('enrollments')
    .select('*')
    .eq('id', 113)
    .single();

  if (enrollErr) {
    console.error("❌ Error fetching enrollment:", enrollErr.message);
    return;
  }

  console.log("✅ Enrollment found:");
  console.log("   User Email:", enrollment.user_email);
  console.log("   User Name:", enrollment.user_name);
  console.log("   Payment Status:", enrollment.payment_status);
  console.log("   Status:", enrollment.status);
  console.log("   TX Ref:", enrollment.tx_ref || "MISSING");
  console.log("   Transaction ID:", enrollment.transaction_id || "MISSING");
  console.log("   Amount:", enrollment.amount);
  console.log("   Has payment_meta:", enrollment.payment_meta ? "YES" : "NO");
  console.log("   Has flw_ref:", enrollment.flw_ref ? "YES" : "NO");

  // 2. Check if columns exist
  console.log("\n[2] Checking database schema...");
  const { data: testUpdate, error: updateErr } = await supabase
    .from('enrollments')
    .select('payment_meta, flw_ref')
    .limit(1);

  if (updateErr) {
    console.error("❌ Schema check failed:", updateErr.message);
    console.log("   → Migration likely NOT run. Columns missing.");
  } else {
    console.log("✅ Schema check passed. Columns exist.");
  }

  // 3. Test Flutterwave search
  if (enrollment.user_email && process.env.FLUTTERWAVE_SECRET_KEY) {
    console.log("\n[3] Testing Flutterwave email search...");
    const url = `https://api.flutterwave.com/v3/transactions?customer_email=${encodeURIComponent(enrollment.user_email)}&status=successful&limit=5`;
    
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        console.error("❌ Flutterwave API error:", json.message || res.statusText);
      } else {
        console.log(`✅ Flutterwave responded with status: ${res.status}`);
        console.log(`   Transactions found: ${json.data ? json.data.length : 0}`);
        
        if (json.data && json.data.length > 0) {
          console.log("\n   Most recent transaction:");
          const tx = json.data[0];
          console.log("   - ID:", tx.id);
          console.log("   - Amount:", tx.amount, tx.currency);
          console.log("   - Status:", tx.status);
          console.log("   - TX Ref:", tx.tx_ref);
          console.log("   - Customer Email:", tx.customer?.email);
        }
      }
    } catch (e) {
      console.error("❌ Flutterwave request failed:", e.message);
    }
  } else {
    console.log("\n[3] Skipping Flutterwave test (missing email or API key)");
  }

  // 4. Test basic update
  console.log("\n[4] Testing basic database update...");
  const { error: basicUpdateErr } = await supabase
    .from('enrollments')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', 113);

  if (basicUpdateErr) {
    console.error("❌ Basic update failed:", basicUpdateErr.message);
  } else {
    console.log("✅ Basic update successful");
  }

  console.log("\n=== Diagnosis Complete ===");
}

diagnose().catch(console.error);
