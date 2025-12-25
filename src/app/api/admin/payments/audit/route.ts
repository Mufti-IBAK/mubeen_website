import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const search = new URL(req.url).searchParams;
    const flwId = search.get("flw_id");
    const txRef = search.get("tx_ref");

    if (!flwId && !txRef) return NextResponse.json({ error: "missing_params" }, { status: 400 });

    const FLW_SK = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!FLW_SK) return NextResponse.json({ error: "missing_config" }, { status: 500 });

    // Admin Auth Check
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let accessToken: string | undefined = undefined;
    if (authHeader && /^Bearer\s+/i.test(authHeader)) accessToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!accessToken) {
      const c = await cookies();
      accessToken = c.get('sb-access-token')?.value || c.get('sb:token')?.value || undefined;
    }
    if (!accessToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    // Verify admin role via auth/v1/user + profiles skip for brevity in this specific audit tool, or do full check
    // Assuming the user is admin if they have a valid token and we trust the UI routing for now, 
    // but in a real app we'd fetch the profile role here too. 
    // Let's do the role check for robustness.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const ures = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon!, Authorization: `Bearer ${accessToken}` } });
    if (!ures.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const user = await ures.json();
    
    const pres = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { apikey: service!, Authorization: `Bearer ${service!}` } });
    const prof = await pres.json();
    if (prof?.[0]?.role !== 'admin' && prof?.[0]?.role !== 'super_admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    let flutterwaveUrl = flwId 
      ? `https://api.flutterwave.com/v3/transactions/${flwId}/verify`
      : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef!)}`;

    const flwRes = await fetch(flutterwaveUrl, {
      headers: { Authorization: `Bearer ${FLW_SK}` }
    });
    
    const data = await flwRes.json();
    return NextResponse.json(data);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
