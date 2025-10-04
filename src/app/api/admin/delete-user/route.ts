import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body?.id as string | undefined;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
    if (!baseUrl || !serviceKey) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });

    const url = new URL(`auth/v1/admin/users/${id}`, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
    const resp = await fetch(url.toString(), {
      method: 'DELETE',
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error('Delete user failed:', resp.status, t);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Delete user route error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
