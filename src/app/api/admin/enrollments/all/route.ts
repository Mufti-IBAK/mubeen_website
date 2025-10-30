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

    const admin = createClient(url, service);

    const [{ data: enr }, { data: drafts }] = await Promise.all([
      admin.from('enrollments').select('id,user_id,program_id,status,payment_status,amount,currency,transaction_id,form_data,classroom_link,defer_active,completed_at,created_at').order('created_at', { ascending: false }),
      admin.from('registration_drafts').select('id,user_id,program_id,registration_type,family_size,last_edited_at').order('last_edited_at', { ascending: false })
    ]);

    const enrollments = (enr as any[] || []).map((e) => ({ ...e, is_draft: false }));
    const draftItems = (drafts as any[] || []).map((d) => ({
      id: -Number(d.id),
      user_id: d.user_id,
      program_id: d.program_id,
      status: 'draft',
      payment_status: 'pending',
      amount: null,
      currency: null,
      transaction_id: null,
      form_data: null,
      classroom_link: null,
      defer_active: null,
      completed_at: null,
      created_at: d.last_edited_at,
      is_draft: true,
      registration_type: d.registration_type,
      family_size: d.family_size,
    }));

    const items = [...draftItems, ...enrollments];
    const userIds = Array.from(new Set(items.map(i => i.user_id)));
    const profiles: Record<string, { full_name: string | null; email: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await admin.from('profiles').select('id,full_name,email').in('id', userIds);
      (profs as any[] || []).forEach(p => { profiles[p.id] = { full_name: p.full_name, email: p.email }; });
    }

    return NextResponse.json({ items, profiles });
  } catch (e: any) {
    console.error('all enrollments error', e);
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}