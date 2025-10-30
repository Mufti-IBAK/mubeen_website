import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function getEnv(name: string, fb?: string) {
  const v = process.env[name] ?? fb;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

export async function GET(req: NextRequest) {
  try {
    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anon = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);

    const c = await cookies();
    const token = c.get('sb-access-token')?.value || c.get('sb:token')?.value;
    if (!token) return NextResponse.json({ items: [] });

    // Get auth user
    const userRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!userRes.ok) return NextResponse.json({ items: [] });
    const user = await userRes.json();

    // Fetch by user_id or fallback to email
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const admin = createClient(url, service as string);

    const { data: rows } = await admin
      .from('unpaid_enroll')
      .select('id,se_id,user_id,user_name,user_email,program_id,program_title,form_data,created_at')
      .or(`user_id.eq.${user.id},user_email.eq.${user.email ?? ''}`)
      .order('created_at', { ascending: false });

    return NextResponse.json({ items: rows || [] });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message || 'server_error' }, { status: 200 });
  }
}
