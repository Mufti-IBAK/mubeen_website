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

async function verifyExistingRefs() {
  console.log("=== Verifying Existing Transaction References ===\n");

  // Get all enrollments with tx_ref
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('*')
    .not('tx_ref', 'is', null)
    .neq('tx_ref', '');

  if (error) {
    console.error("Error fetching enrollments:", error.message);
    return;
  }

  console.log(`Found ${enrollments.length} enrollments with tx_ref\n`);

  let verified = 0;
  let alreadyPaid = 0;
  let failed = 0;

  for (const enrollment of enrollments) {
    console.log(`\nEnrollment #${enrollment.id} - ${enrollment.user_name}`);
    console.log(`  Current status: ${enrollment.payment_status}`);
    console.log(`  TX Ref: ${enrollment.tx_ref}`);

    try {
      // Verify with Flutterwave
      const res = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(enrollment.tx_ref)}`,
        { headers: { Authorization: `Bearer ${FLW_SK}` } }
      );

      if (!res.ok) {
        console.log(`  ❌ Verification failed: ${res.status}`);
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
        narration: data.narration || 'Mubeen Academy',
        originator_account: data.meta?.originatoraccountnumber || 'N/A'
      };

      console.log(`  ✅ Verified with Flutterwave`);
      console.log(`     Amount: ${data.amount} ${data.currency}`);
      console.log(`     Bank: ${richMeta.bank_name}`);
      console.log(`     Originator: ${richMeta.originator_name}`);

      // Update enrollment
      const { error: updateErr } = await supabase
        .from('enrollments')
        .update({
          transaction_id: String(data.id),
          flw_ref: data.flw_ref,
          amount: Number(data.amount),
          currency: data.currency,
          payment_status: 'paid',
          status: 'active',
          payment_meta: richMeta,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollment.id);

      if (updateErr) {
        console.log(`  ❌ Update failed: ${updateErr.message}`);
        failed++;
      } else {
        if (enrollment.payment_status === 'paid') {
          console.log(`  🔄 Updated (was already paid)`);
          alreadyPaid++;
        } else {
          console.log(`  ✅ VERIFIED and MARKED AS PAID`);
          verified++;
        }
      }

    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
      failed++;
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n=== Verification Complete ===`);
  console.log(`Total processed: ${enrollments.length}`);
  console.log(`✅ Newly verified: ${verified}`);
  console.log(`🔄 Already paid (updated): ${alreadyPaid}`);
  console.log(`❌ Failed: ${failed}`);

  // Final stats
  const { data: finalStats } = await supabase
    .from('enrollments')
    .select('payment_status')
    .then(res => {
      const paid = res.data?.filter(e => e.payment_status === 'paid').length || 0;
      const unpaid = res.data?.filter(e => e.payment_status === 'unpaid').length || 0;
      return { data: { total: res.data?.length || 0, paid, unpaid } };
    });

  console.log(`\n=== Final Database State ===`);
  console.log(`Total enrollments: ${finalStats.total}`);
  console.log(`Paid: ${finalStats.paid}`);
  console.log(`Unpaid: ${finalStats.unpaid}`);
}

verifyExistingRefs().catch(console.error);
