import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const se_id = Number(body?.se_id);
    if (!se_id) return NextResponse.json({ ok: false, error: 'missing_se_id' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, service);

    // Load success_enroll row
    const { data: se, error: seErr } = await admin
      .from('success_enroll')
      .select('id,user_id,user_name,user_email,program_id,program_title,form_data,status,amount')
      .eq('id', se_id)
      .single();
    if (seErr || !se) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

    // Only create unpaid for pending/zero-amount
    if (!((se as any).status === 'pending' && (Number((se as any).amount || 0) === 0))) {
      return NextResponse.json({ ok: false, error: 'not_pending_or_nonzero' }, { status: 400 });
    }

    const { error: insErr } = await admin
      .from('unpaid_enroll')
      .insert({
        se_id: (se as any).id,
        user_id: (se as any).user_id,
        user_name: (se as any).user_name,
        user_email: (se as any).user_email,
        program_id: (se as any).program_id,
        program_title: (se as any).program_title,
        form_data: (se as any).form_data || {},
      })
      .select('id')
      .single();

    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
