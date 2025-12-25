const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(url, service);

async function test() {
  const { count, error } = await supabase.from('enrollments').select('*', { count: 'exact', head: true });
  console.log('Enrollments Count:', count);
  if (error) console.error('Error:', error);
  
  const { data: first } = await supabase.from('enrollments').select('*').limit(1);
  console.log('First Record:', JSON.stringify(first, null, 2));
}

test();
