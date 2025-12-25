const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const path = require('path');

// Load env vars manually
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

async function find() {
  console.log("Searching for enrollment #113...");
  const { data: e113 } = await supabase.from("enrollments").select("*").eq("id", 113).single();
  console.log("Current #113:", JSON.stringify(e113, null, 2));

  if (!e113) {
    console.log("Enrollment #113 not found.");
    return;
  }

  console.log("\nSearching for potential profile data...");
  let profiles = [];
  if (e113.user_email || e113.user_id) {
    let query = supabase.from("profiles").select("*");
    const conds = [];
    if (e113.user_id) conds.push(`id.eq.${e113.user_id}`);
    if (e113.user_email) conds.push(`email.eq.${e113.user_email}`);
    if (conds.length > 0) {
      const { data: prof } = await query.or(conds.join(','));
      console.log("Profile:", JSON.stringify(prof, null, 2));
      profiles = prof || [];
    }
  }

  // Search for any paid enrollments for this user email
  if (e113.user_email) {
    console.log(`\nSearching for any successful transaction for email ${e113.user_email}...`);
    const { data: anySuccess } = await supabase.from("enrollments")
      .select("*")
      .ilike("user_email", e113.user_email)
      .neq('id', 113);
    console.log("Other Enrollments for user:", JSON.stringify(anySuccess, null, 2));
  }
}
find();
