import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function reqEnv(name: string, fb?: string) {
  const v = process.env[name] ?? fb;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const seId = Number(id);
    if (!seId || !Number.isFinite(seId)) return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });

    const URL = reqEnv('NEXT_PUBLIC_SUPABASE_URL');
    const ANON = reqEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
    const SERVICE = reqEnv('SUPABASE_SERVICE_ROLE_KEY');

    const c = await cookies();
    const token = c.get('sb-access-token')?.value || c.get('sb:token')?.value || '';
    if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const ures = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!ures.ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    const user = await ures.json();
    const userId = user?.id as string | undefined;
    const userEmail = (user?.email as string | undefined)?.toLowerCase();

    const admin = createClient(URL, SERVICE);
    const { data: row } = await admin
      .from('success_enroll')
      .select('id,user_id,user_email,status')
      .eq('id', seId)
      .maybeSingle();
    if (!row) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    if ((row as any).status !== 'pending') return NextResponse.json({ ok: false, error: 'not_pending' }, { status: 400 });

    const ownerId = (row as any).user_id as string | null;
    const ownerEmail = ((row as any).user_email as string | null)?.toLowerCase();
    const owns = (!!userId && ownerId === userId) || (!!userEmail && !!ownerEmail && ownerEmail === userEmail);
    if (!owns) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const { error: delErr } = await admin.from('success_enroll').delete().eq('id', seId).eq('status', 'pending');
    if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
