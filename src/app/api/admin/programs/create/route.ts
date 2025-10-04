import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function getEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

async function readAccessToken(req: NextRequest) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) return header.slice(7);
  const cookieStore = await cookies();
  return cookieStore.get('sb-access-token')?.value || cookieStore.get('sb:token')?.value;
}

async function isAdminFromRequest(req: NextRequest) {
  const accessToken = await readAccessToken(req);
  if (!accessToken) return false;
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
  // Get user from access token
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!userRes.ok) return false;
  const user = await userRes.json();
  // First try RLS-based profile read using the user's JWT (preferred)
  try {
    const profResRls = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (profResRls.ok) {
      const prof = await profResRls.json();
      if (prof?.[0]?.role === 'admin' || prof?.[0]?.role === 'super_admin') return true;
    }
  } catch {}
  // Fallback to service-role if available
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (service) {
    const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
      headers: { apikey: service as string, Authorization: `Bearer ${service}` },
      cache: 'no-store',
    });
    if (profRes.ok) {
      const prof = await profRes.json();
      if (prof?.[0]?.role === 'admin' || prof?.[0]?.role === 'super_admin') return true;
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await isAdminFromRequest(req);
    if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json();
    // Accept the full payload, sanitize basic types
    const payload: Record<string, unknown> = {
      title: String(body.title || ''),
      slug: String(body.slug || ''),
      description: body.description || null,
      image_url: body.image_url || null,
      duration: body.duration || null,
      tags: Array.isArray(body.tags) ? body.tags : (typeof body.tags === 'string' && body.tags ? String(body.tags).split(',').map((s) => s.trim()).filter(Boolean) : null),
      is_flagship: !!body.is_flagship,
      overview: body.overview || null,
      prerequisites: body.prerequisites || null,
      level: body.level || null,
      language: body.language || null,
      outcomes: Array.isArray(body.outcomes) ? body.outcomes : (typeof body.outcomes === 'string' && body.outcomes ? String(body.outcomes).split(',').map((s) => s.trim()).filter(Boolean) : null),
      instructors: Array.isArray(body.instructors) ? body.instructors : null,
      faqs: Array.isArray(body.faqs) ? body.faqs : null,
      schedule: body.schedule || null,
      start_date: body.start_date || null,
      enrollment_deadline: body.enrollment_deadline || null,
    };

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    const res = await fetch(`${supabaseUrl}/rest/v1/programs`, {
      method: 'POST',
      headers: {
        apikey: service as string,
        Authorization: `Bearer ${service}`,
        'content-type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: 'insert_failed', details: t }, { status: 500 });
    }

    const json = await res.json();
    const row = Array.isArray(json) ? json[0] : json;
    return NextResponse.json({ ok: true, id: row?.id }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'server_error' }, { status: 500 });
  }
}

