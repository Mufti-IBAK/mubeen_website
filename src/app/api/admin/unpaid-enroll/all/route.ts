import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function env(name: string, fb?: string) {
  const v = process.env[name] ?? fb;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

async function isAdmin(req: NextRequest) {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  let token: string | undefined = undefined;
  if (authHeader && /^Bearer\s+/i.test(authHeader)) token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    const c = await cookies();
    token = c.get('sb-access-token')?.value || c.get('sb:token')?.value;
  }
  if (!token) return false;
  const ures = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!ures.ok) return false;
  const user = await ures.json();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const prof = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { apikey: service as string, Authorization: `Bearer ${service}` } });
  if (!prof.ok) return false;
  const p = await prof.json();
  return p?.[0]?.role === 'admin' || p?.[0]?.role === 'super_admin';
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const url = env('NEXT_PUBLIC_SUPABASE_URL');
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const admin = createClient(url, service as string);

    const { data: rows } = await admin
      .from('success_enroll')
      .select('id,user_id,user_name,user_email,created_at,program_id,program_title,form_data,category,status,type')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // group by user (prefer user_id, else normalized email)
    type Group = { user_id: string|null; user_name: string; user_email: string; count: number; latest: string };
    const groups = new Map<string, Group>();
    const norm = (s: string|null|undefined) => (s||'').trim().toLowerCase();

    (rows || []).forEach((r: any) => {
      const idKey = r.user_id ? `id:${r.user_id}` : null;
      const emailKey = r.user_email ? `email:${norm(r.user_email)}` : (r.form_data?.email ? `email:${norm(r.form_data.email)}` : null);
      const key = idKey || emailKey || 'unknown:null';
      const existing = groups.get(key);
      const latest = existing ? (new Date(r.created_at) > new Date(existing.latest) ? r.created_at : existing.latest) : r.created_at;
      groups.set(key, {
        user_id: r.user_id ?? existing?.user_id ?? null,
        user_name: r.user_name || existing?.user_name || r.form_data?.full_name || 'Unknown',
        user_email: r.user_email || existing?.user_email || r.form_data?.email || 'unknown',
        count: (existing?.count || 0) + 1,
        latest,
      });
    });

    return NextResponse.json({ items: Array.from(groups.values()) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
