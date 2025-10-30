import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function env(name: string, fb?: string) {
  const v = process.env[name] ?? fb;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

async function readToken(req: NextRequest) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (h && /^Bearer\s+/i.test(h)) return h.replace(/^Bearer\s+/i, '');
  const c = await cookies();
  return c.get('sb-access-token')?.value || c.get('sb:token')?.value || null;
}

async function ensureAdmin(req: NextRequest) {
  const token = await readToken(req);
  if (!token) return false;
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
  const ures = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!ures.ok) return false;
  const user = await ures.json();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const pres = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { apikey: service as string, Authorization: `Bearer ${service}` }, cache: 'no-store' });
  if (!pres.ok) return false;
  const prof = await pres.json();
  return prof?.[0]?.role === 'admin' || prof?.[0]?.role === 'super_admin';
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await ensureAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await params;
    const program_id = Number(id);
    if (!program_id || Number.isNaN(program_id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const price = Number(body?.price || 0);
    const currency = String(body?.currency || 'NGN');
    const duration_months = Number(body?.duration_months || 3);

    const url = env('NEXT_PUBLIC_SUPABASE_URL');
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    // Upsert individual plan (family_size null)
    const existingRes = await fetch(`${url}/rest/v1/program_plans?program_id=eq.${program_id}&plan_type=eq.individual&family_size=is.null&select=id`, {
      headers: { apikey: service as string, Authorization: `Bearer ${service}` }, cache: 'no-store'
    });
    const existing = existingRes.ok ? await existingRes.json() : [];
    if (existing?.[0]?.id) {
      const up = await fetch(`${url}/rest/v1/program_plans?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        headers: { apikey: service as string, Authorization: `Bearer ${service}`, 'content-type': 'application/json' },
        body: JSON.stringify({ price, currency, duration_months })
      });
      if (!up.ok) return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    } else {
      const ins = await fetch(`${url}/rest/v1/program_plans`, {
        method: 'POST',
        headers: { apikey: service as string, Authorization: `Bearer ${service}`, 'content-type': 'application/json' },
        body: JSON.stringify({ program_id, plan_type: 'individual', family_size: null, price, currency, duration_months })
      });
      if (!ins.ok) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
