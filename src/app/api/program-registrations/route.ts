import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const cookieStore = await cookies();
    const s = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => undefined as any } });
    const u = await s.auth.getUser();
    const userId = (u.data.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const program_id = Number(body?.program_id);
    const form_data = (body?.form_data ?? {}) as Record<string, unknown>;

    if (!program_id || Number.isNaN(program_id)) return NextResponse.json({ error: 'Invalid program_id' }, { status: 400 });

    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data, error } = await admin
      .from('registration_drafts')
      .insert({
        user_id: userId,
        program_id,
        registration_type: 'individual',
        draft_data: form_data,
        last_edited_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}