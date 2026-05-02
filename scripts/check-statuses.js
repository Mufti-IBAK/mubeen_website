const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(url, service);

async function check() {
  const { data: stats, error } = await supabase.rpc('get_status_counts');
  if (error) {
    // If RPC doesn't exist, just select and group locally
    const { data: rows } = await supabase.from('enrollments').select('status, payment_status');
    const counts = {};
    rows.forEach(r => {
      const key = `${r.status}|${r.payment_status}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    console.log('Status Counts:', JSON.stringify(counts, null, 2));
  } else {
    console.log('Stats:', stats);
  }
}

check();
