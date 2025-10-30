import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function reqEnv(name: string) { const v = process.env[name]; if (!v) throw new Error(`Missing env ${name}`); return v; }

async function verifyWithFlutterwaveByRef(secret: string, tx_ref: string) {
  const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(tx_ref)}`,
    { headers: { Authorization: `Bearer ${secret}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || 'verify_failed');
  const data = json?.data || {};
  return data; // { status, id, amount, currency, tx_ref }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tx_ref = url.searchParams.get('tx_ref') || url.searchParams.get('ref');
    if (!tx_ref) return NextResponse.json({ ok: false, error: 'missing_tx_ref' }, { status: 400 });

    // Map tx_ref -> success_enroll id
    const m = /^se-(\d+)(?:-|$)/.exec(tx_ref);
    if (!m) return NextResponse.json({ ok: false, error: 'invalid_tx_ref' }, { status: 400 });
    const seId = Number(m[1]);

    const FLW_SK = reqEnv('FLUTTERWAVE_SECRET_KEY');
    const SUPABASE_URL = reqEnv('NEXT_PUBLIC_SUPABASE_URL');
    const SERVICE = reqEnv('SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Fetch row
    const { data: row } = await admin.from('success_enroll').select('id, program_id, status').eq('id', seId).maybeSingle();
    if (!row) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    if ((row as any).status === 'paid') return NextResponse.json({ ok: true, status: 'paid', id: seId });

    // Verify with Flutterwave by reference
    const data = await verifyWithFlutterwaveByRef(FLW_SK, tx_ref);
    if (!data || data.status !== 'successful' || data.tx_ref !== tx_ref) {
      return NextResponse.json({ ok: false, error: 'not_successful' }, { status: 400 });
    }

    const amount = Number(data.amount || 0);
    const currency = String(data.currency || 'NGN');

    // Strict price check against individual plan if available
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

    // Update row as paid
    const { error: updErr } = await admin
      .from('success_enroll')
      .update({ status: 'paid', amount, currency, transaction_id: String(data.id) })
      .eq('id', seId);
    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, status: 'paid', id: seId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
