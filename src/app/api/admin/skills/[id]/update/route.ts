import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function env(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

async function readAccessToken(req: NextRequest) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) return header.slice(7);
  const store = await cookies();
  return store.get('sb-access-token')?.value || store.get('sb:token')?.value;
}

async function isAdminFromRequest(req: NextRequest) {
  const accessToken = await readAccessToken(req);
  if (!accessToken) return false;
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
  const ures = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
  if (!ures.ok) return false;
  const user = await ures.json();
  // try RLS first
  const profR = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { apikey: anon, Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
  if (profR.ok) {
    const prof = await profR.json();
    if (prof?.[0]?.role === 'admin' || prof?.[0]?.role === 'super_admin') return true;
  }
  // fallback to service
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (service) {
    const profS = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { apikey: service as string, Authorization: `Bearer ${service}` }, cache: 'no-store' });
    if (profS.ok) {
      const prof = await profS.json();
      if (prof?.[0]?.role === 'admin' || prof?.[0]?.role === 'super_admin') return true;
    }
  }
  return false;
}

// Secure admin update for programs using service role, after verifying requester is admin
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const skillId = Number(id);
    if (!skillId || Number.isNaN(skillId)) {
      return NextResponse.json({ ok: false, error: "Invalid skill id" }, { status: 400 });
    }

    const isAdmin = await isAdminFromRequest(req);
    if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!serviceKey) return NextResponse.json({ ok: false, error: "Service role key not configured" }, { status: 500 });

    const supabaseAdmin = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), serviceKey as string);
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    const allowed = [
      "title","slug","description","image_url","duration","tags","is_flagship",
      "overview","prerequisites","level","language","outcomes",
      "instructors","faqs","schedule","start_date","enrollment_deadline",
    ];
    for (const k of allowed) if (k in body) patch[k] = body[k];

    // Sanitize slug if provided
    if (typeof patch.slug === 'string') {
      const s = String(patch.slug);
      patch.slug = s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    }

    const { error } = await supabaseAdmin.from("skills").update(patch).eq("id", skillId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

