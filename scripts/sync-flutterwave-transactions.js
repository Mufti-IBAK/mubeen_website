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

async function syncFlutterwaveTransactions() {
  console.log("=== Syncing Flutterwave Transactions ===\n");

  // Get date range from enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1);

  const oldestEnrollment = enrollments?.[0]?.created_at;
  const fromDate = oldestEnrollment ? new Date(oldestEnrollment) : new Date('2024-01-01');
  const toDate = new Date();

  console.log(`Date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}\n`);

  let allTransactions = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  // Fetch all successful transactions with date range
  console.log("Fetching transactions from Flutterwave...");
  while (hasMore && page <= 20) {
    try {
      // Try with date range
      const url = `https://api.flutterwave.com/v3/transactions?status=successful&from=${fromDate.toISOString()}&to=${toDate.toISOString()}&page=${page}`;
      
      console.log(`  Fetching page ${page}...`);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${FLW_SK}` }
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`  Failed: ${res.status} - ${errorText}`);
        
        // Try without date filter
        console.log(`  Retrying without date filter...`);
        const url2 = `https://api.flutterwave.com/v3/transactions?status=successful&page=${page}`;
        const res2 = await fetch(url2, {
          headers: { Authorization: `Bearer ${FLW_SK}` }
        });
        
        if (!res2.ok) {
          console.error(`  Still failed: ${res2.status}`);
          break;
        }
        
        const json2 = await res2.json();
        const transactions2 = json2.data || [];
        console.log(`  Page ${page}: ${transactions2.length} transactions (no date filter)`);
        allTransactions = allTransactions.concat(transactions2);
        hasMore = transactions2.length === perPage;
      } else {
        const json = await res.json();
        const transactions = json.data || [];
        console.log(`  Page ${page}: ${transactions.length} transactions`);
        allTransactions = allTransactions.concat(transactions);
        hasMore = transactions.length === perPage;
      }

      page++;
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e) {
      console.error(`  Error on page ${page}:`, e.message);
      break;
    }
  }

  console.log(`\nTotal transactions fetched: ${allTransactions.length}`);

  if (allTransactions.length > 0) {
    console.log(`\nSample transaction structure:`);
    console.log(JSON.stringify(allTransactions[0], null, 2).substring(0, 500) + '...');
  }

  // Filter for Mubeen Academy transactions
  const mubeenTransactions = allTransactions.filter(tx => 
    tx.meta && (tx.meta.success_enroll_id || tx.meta.kind === 'program' || tx.meta.kind === 'skill')
  );

  console.log(`\nMubeen Academy transactions: ${mubeenTransactions.length}`);

  if (mubeenTransactions.length === 0 && allTransactions.length > 0) {
    console.log(`\nNo Mubeen transactions found. Checking meta structure of first transaction:`);
    console.log(JSON.stringify(allTransactions[0].meta, null, 2));
  }

  let updated = 0;
  let verified = 0;
  let skipped = 0;
  let errors = 0;

  for (const tx of mubeenTransactions) {
    const enrollId = parseInt(tx.meta.success_enroll_id);
    
    console.log(`\nProcessing Transaction for Enrollment #${enrollId}`);
    console.log(`  TX Ref: ${tx.tx_ref}`);
    console.log(`  FLW Ref: ${tx.flw_ref}`);
    console.log(`  Amount: ${tx.amount} ${tx.currency}`);
    console.log(`  Bank: ${tx.meta.bankname || 'N/A'}`);
    console.log(`  Originator: ${tx.meta.originatorname || tx.customer?.name || 'N/A'}`);

    try {
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id, payment_status')
        .eq('id', enrollId)
        .single();

      if (!existing) {
        console.log(`  ⚠️  Enrollment #${enrollId} not found - skipping`);
        skipped++;
        continue;
      }

      const richMeta = {
        bank_name: tx.meta.bankname || tx.account?.bank_name || 'N/A',
        originator_name: tx.meta.originatorname || tx.customer?.name || 'N/A',
        payment_type: tx.payment_type || 'N/A',
        ip_address: tx.ip || 'N/A',
        created_at: tx.created_at,
        paid_at: tx.created_at,
        flw_ref: tx.flw_ref,
        narration: tx.narration || 'Mubeen Academy',
        originator_account: tx.meta.originatoraccountnumber || 'N/A'
      };

      const { error: updateErr } = await supabase
        .from('enrollments')
        .update({
          tx_ref: tx.tx_ref,
          transaction_id: String(tx.id),
          flw_ref: tx.flw_ref,
          amount: Number(tx.amount),
          currency: tx.currency,
          payment_status: 'paid',
          status: 'active',
          payment_meta: richMeta,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollId);

      if (updateErr) {
        console.log(`  ❌ Update failed: ${updateErr.message}`);
        errors++;
      } else {
        if (existing.payment_status === 'paid') {
          console.log(`  ✅ UPDATED (refreshed data)`);
          updated++;
        } else {
          console.log(`  ✅ VERIFIED and MARKED AS PAID`);
          verified++;
        }
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n=== Sync Complete ===`);
  console.log(`Total FLW transactions: ${allTransactions.length}`);
  console.log(`Mubeen transactions: ${mubeenTransactions.length}`);
  console.log(`✅ Newly verified: ${verified}`);
  console.log(`🔄 Updated existing: ${updated}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
}

syncFlutterwaveTransactions().catch(console.error);
