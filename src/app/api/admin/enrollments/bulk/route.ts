import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Bulk admin actions for enrollments using service role and RPC.
// Body: { action: 'mark_paid'|'refund'|'transfer', ids: number[], target_program_id?: number }
// Returns per-id results.

function getEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

async function isAdminFromCookies() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb:token')?.value || cookieStore.get('sb-access-token')?.value;
  if (!accessToken) return false;
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!userRes.ok) return false;
  const user = await userRes.json();

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
    headers: { apikey: service as string, Authorization: `Bearer ${service}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!profRes.ok) return false;
  const prof = await profRes.json();
  return (prof?.[0]?.role === 'admin' || prof?.[0]?.role === 'super_admin');
}

export async function POST(req: NextRequest) {
  try {
    const admin = await isAdminFromCookies();
    if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json();
    const action = body?.action as string;
    const ids = (body?.ids as number[]) || [];
    const target_program_id = body?.target_program_id as number | undefined;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    const rest = async (path: string, init?: RequestInit) => fetch(`${supabaseUrl}${path}`, {
      ...init,
      headers: {
        apikey: service as string,
        Authorization: `Bearer ${service}`,
        'content-type': 'application/json',
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    });

    const results: Record<string, any> = {};

    if (action === 'mark_paid') {
      // Use RPC to set payment_status='paid'
      const rpc = await rest(`/rest/v1/rpc/bulk_update_enrollments`, {
        method: 'POST',
        body: JSON.stringify({ ids, new_status: null, new_payment_status: 'paid' }),
      });
      if (!rpc.ok) {
        const t = await rpc.text();
        return NextResponse.json({ error: 'rpc_failed', details: t }, { status: 500 });
      }
      ids.forEach(id => { results[id] = { ok: true, payment_status: 'paid' }; });
      return NextResponse.json({ ok: true, results });
    }

    if (action === 'transfer') {
      if (!target_program_id) return NextResponse.json({ error: 'missing_target_program_id' }, { status: 400 });
      await Promise.all(ids.map(async (id) => {
        const r = await rest(`/rest/v1/enrollments?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ program_id: target_program_id }) });
        results[id] = { ok: r.ok };
      }));
      return NextResponse.json({ ok: true, results });
    }

    if (action === 'refund') {
      // For each id: if transaction_id exists, call Flutterwave refund (via existing refund endpoint)
      const flwRoute = new URL('/api/admin/refund', getEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')).toString();
      await Promise.all(ids.map(async (id) => {
        // Fetch enrollment to get transaction_id and amount
        const rSel = await rest(`/rest/v1/enrollments?id=eq.${id}&select=transaction_id,amount`);
        const row = (await rSel.json())?.[0];
        if (row?.transaction_id) {
          const r = await fetch(flwRoute, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enrollment_id: id, transaction_id: row.transaction_id, amount: row.amount || undefined }) });
          results[id] = { ok: r.ok };
        } else {
          const r = await rest(`/rest/v1/enrollments?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ payment_status: 'refunded' }) });
          results[id] = { ok: r.ok, mode: 'status-updated-only' };
        }
      }));
      return NextResponse.json({ ok: true, results });
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'server_error' }, { status: 500 });
  }
}

