import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service);
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(key);
    const query = admin.from('success_enroll');
    const { error } = isUuid ? await query.delete().eq('user_id', key) : await query.delete().eq('user_email', decodeURIComponent(key));
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
