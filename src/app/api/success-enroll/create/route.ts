import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getBearer(req: NextRequest) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const p = h.split(' ');
  return p.length === 2 && /^bearer$/i.test(p[0]) ? p[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const body = await req.json().catch(() => ({}));
    const program_id = Number(body?.program_id);
    const form_data = (body?.form_data ?? {}) as Record<string, unknown>;
    if (!program_id || Number.isNaN(program_id)) return NextResponse.json({ error: 'Invalid program_id' }, { status: 400 });

    const bearer = getBearer(req);
    const cookieStore = await cookies();
    const s = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => undefined as any } });

    let user: any = null;
    if (bearer) {
      const tmp = createClient(url, anon);
      const u = await tmp.auth.getUser(bearer);
      user = u.data.user || null;
    } else {
      const u = await s.auth.getUser();
      user = u.data.user || null;
    }

    const admin = createClient(url, service);

    // Attempt to enrich from profiles if available
    let profileFullName: string | null = null;
    let profileEmail: string | null = null;
    if (user?.id) {
      const { data: prof } = await admin.from('profiles').select('full_name,email').eq('id', user.id).maybeSingle();
      profileFullName = (prof as any)?.full_name ?? null;
      profileEmail = (prof as any)?.email ?? null;
    }

    const formEmail = (form_data as any)?.email || (form_data as any)?.user_email || null;
    const formName = (form_data as any)?.full_name || (form_data as any)?.user_name || (form_data as any)?.name || null;

    // New simplified model: no categories; capture registration meta inside form_data
    const registration_mode = 'solo';

    const payload: any = {
      user_id: user?.id ?? null,
      user_email: profileEmail || user?.email || formEmail || null,
      user_name: profileFullName || user?.user_metadata?.full_name || formName || null,
      type: 'program',
      program_id,
      status: 'pending',
      form_data: {
        ...form_data,
        registration_mode,
        participant_count: 1,
      },
    };

    // Pay-later upsert behavior: reuse existing pending registration for same user and program
    let existingId: number | null = null;
    if (payload.user_id) {
      const { data: ex } = await admin
        .from('success_enroll')
        .select('id')
        .eq('program_id', program_id)
        .eq('status', 'pending')
        .eq('user_id', payload.user_id)
        .order('created_at', { ascending: false })
        .maybeSingle();
      existingId = (ex as any)?.id ?? null;
    }
    if (!existingId && payload.user_email) {
      const { data: ex2 } = await admin
        .from('success_enroll')
        .select('id')
        .eq('program_id', program_id)
        .eq('status', 'pending')
        .eq('user_email', payload.user_email)
        .order('created_at', { ascending: false })
        .maybeSingle();
      existingId = (ex2 as any)?.id ?? null;
    }

    if (existingId) {
      const { error: updErr } = await admin
        .from('success_enroll')
        .update({
          form_data: payload.form_data,
          user_email: payload.user_email,
          user_name: payload.user_name,
        })
        .eq('id', existingId);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: existingId });
    }

    const { data, error } = await admin
      .from('success_enroll')
      .insert(payload)
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
