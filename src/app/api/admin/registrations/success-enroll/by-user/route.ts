import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function getEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

export async function GET(req: NextRequest) {
  try {
    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anon = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!service) throw new Error('Missing service role key');

    // Admin auth check
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let accessToken: string | undefined = undefined;
    if (authHeader && /^Bearer\s+/i.test(authHeader)) accessToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!accessToken) {
      const c = await cookies();
      accessToken = c.get('sb-access-token')?.value || c.get('sb:token')?.value || undefined;
    }
    if (!accessToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const userRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    if (!userRes.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const user = await userRes.json();

    const profRes = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { apikey: service, Authorization: `Bearer ${service}` }, cache: 'no-store' });
    if (!profRes.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const prof = await profRes.json();
    const role = prof?.[0]?.role;
    if (!(role === 'admin' || role === 'super_admin')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const search = new URL(req.url).searchParams;
    const user_id = search.get('user_id');
    const email = search.get('user_email');

    if (!user_id && !email) return NextResponse.json({ error: 'missing_filter' }, { status: 400 });

    const admin = createClient(url, service);
    let query = admin
      .from('success_enroll')
      .select('id, user_id, user_name, user_email, type, program_id, program_title, amount, currency, description, tx_ref, transaction_id, status, created_at, form_data, category')
      .or('status.eq.paid,amount.gt.0')
      .order('created_at', { ascending: false });

    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (email) {
      query = query.eq('user_email', email);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ items: data || [] });
  } catch (e: any) {
    console.error('by-user error', e);
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
