import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizePayment, constructRichMeta } from "@/lib/payment-utils";

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

    const m = /^(?:se|er|draft|renew)-(\d+)(?:-|$)/.exec(tx_ref || "");
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

    // Construct Rich Metadata via shared helper
    const richMeta = constructRichMeta(data);

    // Update row via shared utility
    const { ok: finalOk, error: finalErr } = await finalizePayment(admin, {
      enrollmentId,
      amount,
      currency,
      transactionId: String(id),
      flwRef: data.flw_ref,
      txRef: tx_ref,
      richMeta
    });

    if (!finalOk) {
      console.error("Webhook update error:", finalErr);
      return NextResponse.json(
        { ok: false, error: finalErr },
        { status: 500 }
      );
    }

    console.log(`✅ Webhook: Enrollment #${enrollmentId} verified and updated via shared utility`);
    return NextResponse.json({ ok: true, status: "paid", id: enrollmentId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 }
    );
  }
}
