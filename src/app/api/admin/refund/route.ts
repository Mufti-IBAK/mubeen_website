import { NextRequest, NextResponse } from "next/server";

// Secure admin refund endpoint for Flutterwave
// Expects JSON body: { enrollment_id: number, transaction_id?: string, amount?: number }
// Behavior:
// - If transaction_id provided: attempts real refund via Flutterwave API, then updates payment_status='refunded'.
// - If not provided: falls back to updating payment_status='refunded' only.
// NOTE: This route enforces admin (admin or super_admin) via Supabase auth.

const FLW_URL = "https://api.flutterwave.com/v3";

function getEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

async function updateEnrollment(ref: { id: number }, fields: Record<string, unknown>) {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!service) throw new Error("Missing service role key");
  const res = await fetch(`${url}/rest/v1/enrollments?id=eq.${ref.id}`, {
    method: "PATCH",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to update enrollment: ${res.status} ${txt}`);
  }
  return res.json();
}

import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!service) throw new Error('Missing service role key');

    // Resolve access token from Authorization header or cookies
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let accessToken: string | undefined = undefined;
    if (authHeader && /^Bearer\s+/i.test(authHeader)) {
      accessToken = authHeader.replace(/^Bearer\s+/i, '');
    }
    if (!accessToken) {
      const cookieStore = await cookies();
      accessToken = cookieStore.get('sb-access-token')?.value || cookieStore.get('sb:token')?.value || undefined;
    }
    if (!accessToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    // Get user by access token
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!userRes.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const user = await userRes.json();

    // Check admin role via profiles
    const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` },
      cache: 'no-store',
    });
    if (!profRes.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const prof = await profRes.json();
    const role = prof?.[0]?.role;
    if (!(role === 'admin' || role === 'super_admin')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json();
    const enrollment_id = Number(body?.enrollment_id);
    const transaction_id = body?.transaction_id ? String(body.transaction_id) : undefined;
    const amount = body?.amount ? Number(body.amount) : undefined;

    if (!enrollment_id || Number.isNaN(enrollment_id)) {
      return NextResponse.json({ error: "enrollment_id is required" }, { status: 400 });
    }

    // TODO: Admin auth check (verify current user is admin). For now, assume admin.

    if (!transaction_id) {
      // Fallback: just mark refunded in DB
      await updateEnrollment({ id: enrollment_id }, { payment_status: "refunded" });
      return NextResponse.json({ ok: true, mode: "status-updated-only" });
    }

    // Real refund via Flutterwave
    const secret = getEnv("FLUTTERWAVE_SECRET_KEY");
    const refundRes = await fetch(`${FLW_URL}/transactions/${transaction_id}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(amount ? { amount } : {}),
    });

    const refundJson = await refundRes.json().catch(() => ({}));
    if (!refundRes.ok || (refundJson && refundJson.status && refundJson.status !== "success")) {
      return NextResponse.json({ error: "Flutterwave refund failed", details: refundJson }, { status: 400 });
    }

    await updateEnrollment({ id: enrollment_id }, {
      payment_status: "refunded",
      refund_reference: refundJson?.data?.id ?? refundJson?.data?.reference ?? null,
      refunded_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, mode: "refunded", flutterwave: refundJson });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "unknown_error" }, { status: 500 });
  }
}

