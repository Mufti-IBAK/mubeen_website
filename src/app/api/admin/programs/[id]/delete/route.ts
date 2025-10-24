import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function env(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

async function readAccessToken(req: NextRequest) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) return header.slice(7);
  // cookies() not needed here for same-origin fetch; browser will include it; backend will read via service
  return null;
}

async function isAdminFromRequest(req: NextRequest) {
  const accessToken = await readAccessToken(req);
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
  if (!accessToken) return false;
  const ures = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
  if (!ures.ok) return false;
  const user = await ures.json();
  const profR = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { apikey: anon, Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
  if (profR.ok) {
    const prof = await profR.json();
    if (prof?.[0]?.role === 'admin' || prof?.[0]?.role === 'super_admin') return true;
  }
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (service) {
    const profS = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { apikey: service as string, Authorization: `Bearer ${service}` }, cache: 'no-store' });
    if (profS.ok) { const prof = await profS.json(); if (prof?.[0]?.role === 'admin' || prof?.[0]?.role === 'super_admin') return true; }
  }
  return false;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const programId = Number(id);
    if (!programId || Number.isNaN(programId)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

    const isAdmin = await isAdminFromRequest(req);
    if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!serviceKey) return NextResponse.json({ ok: false, error: "Service role not configured" }, { status: 500 });

    const supabaseAdmin = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), serviceKey as string);

    // Get slug for revalidation before delete
    const { data: row } = await supabaseAdmin.from('programs').select('slug').eq('id', programId).single();
    const { error } = await supabaseAdmin.from("programs").delete().eq("id", programId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    // Revalidate pages
    revalidatePath('/programs');
    revalidatePath('/admin/programs');
    if (row?.slug) revalidatePath(`/programs/${row.slug}`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
