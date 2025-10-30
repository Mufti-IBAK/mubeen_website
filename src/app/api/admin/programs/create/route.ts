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
    const rawTitle = String(body.title || '');
    const rawSlug = String(body.slug || '');
    const slugSanitized = rawSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const payload: Record<string, unknown> = {
      title: rawTitle,
      slug: slugSanitized,
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

    // After creating a program, auto-seed default Individual form from existing template
    try {
      const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
      // Fetch a default individual form schema from any existing program
      const tplRes = await fetch(`${url}/rest/v1/program_forms?form_type=eq.individual&select=schema&limit=1`, {
        headers: { apikey: service as string, Authorization: `Bearer ${service}` }, cache: 'no-store'
      });
      let schema: any = null;
      if (tplRes.ok) {
        const arr = await tplRes.json();
        schema = arr?.[0]?.schema || null;
      }
      // Fallback basic schema if none exists
      if (!schema) {
        schema = {
          title: `Register for ${rawTitle || 'Program'}`,
          fields: [
            { type: 'text', name: 'full_name', label: 'Full name', required: true },
            { type: 'email', name: 'email', label: 'Email', required: true },
            { type: 'tel', name: 'phone', label: 'Phone', required: false },
          ],
        };
      }
      // Insert for new program
      await fetch(`${url}/rest/v1/program_forms`, {
        method: 'POST',
        headers: { apikey: service as string, Authorization: `Bearer ${service}`, 'content-type': 'application/json' },
        body: JSON.stringify({ program_id: row?.id, form_type: 'individual', schema })
      });

      // Ensure a default Individual plan exists as well (so payment works end-to-end)
      await fetch(`${url}/rest/v1/program_plans`, {
        method: 'POST',
        headers: { apikey: service as string, Authorization: `Bearer ${service}`, 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ program_id: row?.id, plan_type: 'individual', family_size: null, price: 0, currency: 'NGN', duration_months: 3 })
      });
    } catch {}

    return NextResponse.json({ ok: true, id: row?.id }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'server_error' }, { status: 500 });
  }
}

