import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function env(name: string) { const v = process.env[name]; if (!v) throw new Error(`Missing env ${name}`); return v; }

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get('verif-hash');
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || process.env.FLW_SECRET_HASH || '';
    if (!secret || sig !== secret) return NextResponse.json({ ok: false }, { status: 403 });
    const payload = await req.json().catch(() => ({}));
    const data = payload?.data || {};
    const status = data?.status;
    const tx_ref = data?.tx_ref || '';
    const id = data?.id;
    const amount = Number(data?.amount || 0);
    const currency = String(data?.currency || 'NGN');

    const m = /^se-(\d+)(?:-|$)/.exec(tx_ref || '');
    if (!m) return NextResponse.json({ ok: false, error: 'invalid_ref' }, { status: 400 });
    const seId = Number(m[1]);

    const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL');
    const SERVICE = env('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: row } = await admin.from('success_enroll').select('id, program_id, status').eq('id', seId).maybeSingle();
    if (!row) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    if ((row as any).status === 'paid') return NextResponse.json({ ok: true, status: 'paid', id: seId });

    if (status !== 'successful') return NextResponse.json({ ok: false, error: 'not_successful' }, { status: 400 });

    // Strict price check against program plan
    let priceOk = true;
    if ((row as any).program_id) {
      const pid = (row as any).program_id as number;
      const { data: plan } = await admin
        .from('program_plans')
        .select('price,currency')
        .eq('program_id', pid)
        .eq('plan_type', 'individual')
        .is('family_size', null)
        .maybeSingle();
      if (plan) {
        const expected = Number((plan as any).price || 0);
        const ec = (plan as any).currency || 'NGN';
        priceOk = expected > 0 && amount === expected && currency === ec;
      }
    }
    if (!priceOk) return NextResponse.json({ ok: false, error: 'amount_mismatch' }, { status: 400 });

    const { error: updErr } = await admin
      .from('success_enroll')
      .update({ status: 'paid', amount, currency, transaction_id: String(id) })
      .eq('id', seId);
    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, status: 'paid', id: seId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}