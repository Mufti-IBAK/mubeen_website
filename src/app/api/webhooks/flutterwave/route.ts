import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("verif-hash");
    const secret =
      process.env.FLUTTERWAVE_WEBHOOK_SECRET ||
      process.env.FLW_SECRET_HASH ||
      "";
    if (!secret || sig !== secret)
      return NextResponse.json({ ok: false }, { status: 403 });
    const payload = await req.json().catch(() => ({}));
    const data = payload?.data || {};
    const status = data?.status;
    const tx_ref = data?.tx_ref || "";
    const id = data?.id;
    const amount = Number(data?.amount || 0);
    const currency = String(data?.currency || "NGN");

    const m = /^(?:se|er)-(\d+)(?:-|$)/.exec(tx_ref || "");
    if (!m)
      return NextResponse.json(
        { ok: false, error: "invalid_ref" },
        { status: 400 }
      );
    const enrollmentId = Number(m[1]);

    const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
    const SERVICE = env("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: row } = await admin
      .from("enrollments")
      .select("id, program_id, status")
      .eq("id", enrollmentId)
      .maybeSingle();
    if (!row)
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    if ((row as any).status === "paid" || (row as any).status === "active")
      return NextResponse.json({ ok: true, status: "paid", id: enrollmentId });

    if (status !== "successful")
      return NextResponse.json(
        { ok: false, error: "not_successful" },
        { status: 400 }
      );

    // Strict price check against program plan
    let priceOk = true;
    if ((row as any).program_id) {
      const pid = (row as any).program_id as number;
      const { data: plan } = await admin
        .from("program_plans")
        .select("price,currency")
        .eq("program_id", pid)
        .eq("plan_type", "individual")
        .is("family_size", null)
        .maybeSingle();
      if (plan) {
        const expected = Number((plan as any).price || 0);
        const ec = (plan as any).currency || "NGN";
        priceOk = expected > 0 && amount === expected && currency === ec;
      }
    }
    if (!priceOk)
      return NextResponse.json(
        { ok: false, error: "amount_mismatch" },
        { status: 400 }
      );

    // Extract rich metadata from webhook payload
    const richMeta = {
      bank_name: data.meta?.bankname || data.account?.bank_name || 'N/A',
      originator_name: data.meta?.originatorname || data.customer?.name || 'N/A',
      payment_type: data.payment_type || 'N/A',
      ip_address: data.ip || 'N/A',
      created_at: data.created_at,
      paid_at: data.created_at,
      flw_ref: data.flw_ref,
      narration: data.narration || 'Mubeen Academy',
      originator_account: data.meta?.originatoraccountnumber || 'N/A'
    };

    const { error: updErr } = await admin
      .from("enrollments")
      .update({
        status: "active",
        payment_status: "paid",
        tx_ref: tx_ref,  // CRITICAL: Save the transaction reference
        transaction_id: String(id),
        flw_ref: data.flw_ref,  // CRITICAL: Save Flutterwave reference
        amount,
        currency,
        payment_meta: richMeta,  // CRITICAL: Save rich metadata
        updated_at: new Date().toISOString()
      })
      .eq("id", enrollmentId);
    
    if (updErr) {
      console.error("Webhook update error:", updErr);
      return NextResponse.json(
        { ok: false, error: updErr.message },
        { status: 500 }
      );
    }

    console.log(`✅ Webhook: Enrollment #${enrollmentId} verified and updated`);
    return NextResponse.json({ ok: true, status: "paid", id: enrollmentId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
