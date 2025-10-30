import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function getSigningSecret(): string {
  // Prefer dedicated secret, but fall back gracefully to existing server secrets to avoid runtime failures
  return (
    process.env.SUMMARY_SIGNING_SECRET ||
    process.env.FLUTTERWAVE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-summary-secret'
  );
}

// Create a signed token for summary data and redirect to /payment/summary?token=...
export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || '';
    let body: any = {};
    if (ct.includes('application/json')) body = await req.json();
    else { const fd = await req.formData(); fd.forEach((v, k) => (body[k] = String(v))); }

    const payload = {
      full_name: String(body.full_name || ''),
      email: String(body.email || ''),
      kind: String(body.kind || 'program'),
      amount: String(body.amount || ''),
      currency: String(body.currency || 'NGN'),
      program_id: body.program_id ? Number(body.program_id) : undefined,
      description: body.description ? String(body.description) : undefined,
      se: body.se ? String(body.se) : undefined,
      ts: Date.now(),
    };
    const secret = getSigningSecret();
    const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
    const token = `${b64}.${sig}`;
    const origin = req.nextUrl.origin;
    const url = new URL('/payment/summary', origin);
    url.searchParams.set('token', token);
    return NextResponse.redirect(url.toString(), 302);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
