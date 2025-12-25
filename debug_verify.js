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
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const FLW_SK = process.env.FLUTTERWAVE_SECRET_KEY;

async function testVerification() {
  console.log("=== Testing Strategic Verification Logic ===");
  const targetEmail = "maryamsibrahim14@gmail.com"; 
  console.log("Target Email:", targetEmail);

  if (!FLW_SK) {
      console.error("Missing FLUTTERWAVE_SECRET_KEY");
      return;
  }

  // 1. Test Email Search
  console.log("\n[1] Testing FLW Email Search...");
  const url = `https://api.flutterwave.com/v3/transactions?customer_email=${encodeURIComponent(targetEmail)}&status=successful&limit=5`;
  try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${FLW_SK}` } });
      const json = await res.json();
      console.log("FLW Search Result Status:", res.status);
      console.log("FLW Search Data Found:", json.data ? json.data.length : 0);
      if (json.data && json.data.length > 0) {
          console.log("Most recent transaction:", JSON.stringify(json.data[0], null, 2));
      } else {
          console.log("Full Response:", JSON.stringify(json, null, 2));
      }
  } catch (e) {
      console.error("FLW Search Failed:", e.message);
  }

  // 2. Test Manual Update Patch (Simulation)
  console.log("\n[2] Testing DB Update patch simulation...");
  // Check if columns exist
  const { data: cols, error: colErr } = await supabase
    .from('enrollments')
    .select('payment_meta, flw_ref')
    .limit(1);
    
  if (colErr) {
      console.log("Column Check Error (Migration likely missing):", colErr.message);
  } else {
      console.log("Columns likely match schema.");
  }
}

testVerification();
