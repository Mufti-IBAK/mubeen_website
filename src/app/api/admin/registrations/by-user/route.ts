import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function env(name: string, fb?: string) {
  const v = process.env[name] ?? fb;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

async function isAdmin(req: NextRequest) {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  let token: string | undefined = undefined;
  if (authHeader && /^Bearer\s+/i.test(authHeader)) token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    const c = await cookies();
    token = c.get('sb-access-token')?.value || c.get('sb:token')?.value;
  }
  if (!token) return false;
  const ures = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!ures.ok) return false;
  const user = await ures.json();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const prof = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { apikey: service as string, Authorization: `Bearer ${service}` } });
  if (!prof.ok) return false;
  const p = await prof.json();
  return p?.[0]?.role === 'admin' || p?.[0]?.role === 'super_admin';
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const url = env('NEXT_PUBLIC_SUPABASE_URL');
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const admin = createClient(url, service as string);

    const search = new URL(req.url).searchParams;
    const user_id = search.get('user_id');
    const email = search.get('user_email');
    if (!user_id && !email) return NextResponse.json({ error: 'missing_filter' }, { status: 400 });

    let query = admin
      .from('success_enroll')
      .select('id,user_id,user_name,user_email,program_id,program_title,form_data,created_at,amount,currency,type,status,transaction_id')
      .eq('status', 'paid')
      .order('created_at', { ascending: false });
    if (user_id) query = query.eq('user_id', user_id);
    else if (email) query = query.eq('user_email', email);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
