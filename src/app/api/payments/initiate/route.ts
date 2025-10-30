import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function required(name: string, v: string | null) {
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || '';
    let body: any = {};
    if (ct.includes('application/json')) body = await req.json();
    else { const form = await req.formData(); form.forEach((v, k) => (body[k] = String(v))); }

    const full_name = required('full_name', body.full_name ?? null);
    const email = required('email', body.email ?? null);
    const kind = required('kind', body.kind ?? null) as 'program'|'donation'|'other';
    let amount = Number(required('amount', body.amount ?? null));
    let currency = (body.currency as string) || 'NGN';
    const program_id = body.program_id ? Number(body.program_id) : null;
    const description = (body.description as string) || null;

    const url = required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL ?? null);
    const service = required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY ?? null);
    const admin = createClient(url, service);

    // Identify user via Bearer or cookie session
    let user_id: string | null = null;
    const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    if (auth.toLowerCase().startsWith('bearer ')) {
      const jwt = auth.slice(7);
      try { const [, p] = jwt.split('.'); const payload = JSON.parse(Buffer.from(p, 'base64').toString('utf8')); user_id = payload.sub || payload.user_id || null; } catch {}
    }
    if (!user_id) {
      try {
        const cookieStore = await cookies();
        const anon = required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null);
        const s = createServerClient(url, anon, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => undefined as any } });
        const u = await s.auth.getUser();
        user_id = (u.data.user as any)?.id ?? null;
      } catch {}
    }

    // If client passes an existing success_enroll row, update it; else create one
    const incomingId = body.success_enroll_id ? Number(body.success_enroll_id) : null;
    let id: number;
    if (incomingId) {
      const { error: updErr } = await admin
        .from('success_enroll')
        .update({ user_id: user_id ?? undefined, user_name: full_name, user_email: email, type: kind, program_id, amount, currency, description, status: 'pending' })
        .eq('id', incomingId);
      if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
      id = incomingId;
    } else {
      const { data: inserted, error: insErr } = await admin
        .from('success_enroll')
        .insert({ user_id, user_name: full_name, user_email: email, type: kind, program_id, amount, currency, description, status: 'pending' })
        .select('id')
        .single();
      if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
      id = inserted!.id as number;
    }

    // Authoritative price source for program payments: program_plans (individual, family_size null)
    if (kind === 'program' && program_id) {
      const { data: plan } = await admin
        .from('program_plans')
        .select('price,currency')
        .eq('program_id', program_id)
        .eq('plan_type', 'individual')
        .is('family_size', null)
        .maybeSingle();
      if (!plan) {
        return NextResponse.json({ ok: false, error: 'missing_plan' }, { status: 400 });
      }
      amount = Number((plan as any).price || 0);
      currency = (plan as any).currency || 'NGN';
      // Persist authoritative amount in success_enroll
      await admin.from('success_enroll').update({ amount, currency }).eq('id', id);
    }

    const tx_ref = `se-${id}-${Date.now()}`;
    await admin.from('success_enroll').update({ tx_ref }).eq('id', id);

    const FLW_SK = required('FLUTTERWAVE_SECRET_KEY', process.env.FLUTTERWAVE_SECRET_KEY ?? null);
    const origin = req.nextUrl.origin;
    const site = (process.env.NEXT_PUBLIC_SITE_URL && /^https?:\/\//i.test(process.env.NEXT_PUBLIC_SITE_URL)) ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '') : origin;
    const redirect_url = `${site}/payment-success?ref=${encodeURIComponent(tx_ref)}`;

    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url,
      customer: { email, name: full_name },
      meta: { success_enroll_id: id, program_id, kind },
      customizations: { title: 'Mubeen Academy', description: 'Payment', logo: '/logo.png' },
    };
    const res = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${FLW_SK}` }, body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    const link = json?.data?.link as string | undefined;
    if (!res.ok || !link) return NextResponse.json({ ok: false, error: 'failed_to_create_payment', details: json }, { status: 500 });

    // Return a small HTML page that immediately redirects; more reliable than HTTP redirect across all clients
    const html = `<!doctype html>
<html><head><meta http-equiv="refresh" content="0;url=${link}"><script>location.replace(${JSON.stringify(link)})</script></head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif;">
<p>Redirecting to payment… If you are not redirected automatically, <a href="${link}">click here</a>.</p>
</body></html>`;
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch (e: any) {
    console.error('initiate payment error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
