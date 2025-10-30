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
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anon = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!service) throw new Error('Missing service role key');

    // auth user
    const c = await cookies();
    const token = c.get('sb-access-token')?.value || c.get('sb:token')?.value;
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const userRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!userRes.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const user = await userRes.json();

    const admin = createClient(url, service as string);
    const { data: row, error } = await admin
      .from('success_enroll')
      .select('id, user_id, user_email, user_name, program_id, amount, currency, form_data')
      .eq('id', id)
      .maybeSingle();
    if (error || !row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // authorize: same user_id or same email
    const ok = (row as any).user_id === user.id || ((row as any).user_email && (row as any).user_email.toLowerCase() === (user.email || '').toLowerCase());
    if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const fd = (row as any).form_data || {};
    const participant_count = Number(fd.participant_count || 1);
    const registration_mode = fd.registration_mode || (participant_count > 1 ? 'group' : 'solo');

    return NextResponse.json({
      id: row.id,
      program_id: row.program_id,
      amount: row.amount,
      currency: row.currency,
      user_email: row.user_email,
      user_name: row.user_name,
      participant_count,
      registration_mode,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
