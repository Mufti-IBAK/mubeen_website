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
const FLW_SK = process.env.FLUTTERWAVE_SECRET_KEY;

async function bulkVerify() {
  console.log("=== Bulk Payment Verification ===\n");

  // Get all unpaid enrollments with tx_ref
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('payment_status', 'unpaid')
    .not('tx_ref', 'is', null);

  if (error) {
    console.error("Error fetching enrollments:", error.message);
    return;
  }

  console.log(`Found ${enrollments.length} unpaid enrollments with tx_ref\n`);

  let verified = 0;
  let failed = 0;

  for (const enrollment of enrollments) {
    console.log(`\nProcessing #${enrollment.id} - ${enrollment.user_name}`);
    console.log(`  TX Ref: ${enrollment.tx_ref}`);

    try {
      // Verify with Flutterwave
      const res = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(enrollment.tx_ref)}`,
        { headers: { Authorization: `Bearer ${FLW_SK}` } }
      );

      if (!res.ok) {
        console.log(`  ❌ FLW verification failed: ${res.status}`);
        failed++;
        continue;
      }

      const json = await res.json();
      const data = json.data;

      if (data.status !== 'successful') {
        console.log(`  ⚠️  Transaction not successful: ${data.status}`);
        failed++;
        continue;
      }

      // Extract rich metadata
      const richMeta = {
        bank_name: data.meta?.bankname || data.account?.bank_name || 'N/A',
        originator_name: data.meta?.originatorname || data.customer?.name || 'N/A',
        payment_type: data.payment_type || 'N/A',
        ip_address: data.ip || 'N/A',
        created_at: data.created_at,
        paid_at: data.created_at,
        flw_ref: data.flw_ref,
        narration: data.narration
      };

      // Update enrollment
      const { error: updateErr } = await supabase
        .from('enrollments')
        .update({
          status: 'active',
          payment_status: 'paid',
          amount: Number(data.amount),
          currency: data.currency,
          transaction_id: String(data.id),
          payment_meta: richMeta,
          flw_ref: data.flw_ref
        })
        .eq('id', enrollment.id);

      if (updateErr) {
        console.log(`  ❌ Database update failed: ${updateErr.message}`);
        failed++;
      } else {
        console.log(`  ✅ VERIFIED and UPDATED to PAID`);
        console.log(`     Bank: ${richMeta.bank_name}`);
        console.log(`     Originator: ${richMeta.originator_name}`);
        verified++;
      }

    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total processed: ${enrollments.length}`);
  console.log(`✅ Verified: ${verified}`);
  console.log(`❌ Failed: ${failed}`);
}

bulkVerify().catch(console.error);
