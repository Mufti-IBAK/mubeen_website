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
  // Validate user
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!userRes.ok) return false;
  const user = await userRes.json();
  // First try RLS with user's token
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
  // Fallback to service role
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
    if (!(await isAdminFromRequest(req))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const body = await req.json();
    const scope = (body?.scope === 'program' || body?.scope === 'course' || body?.scope === 'skill') ? body.scope : 'program';
    const id = Number(body?.id);
    const form_type = String(body?.form_type || 'individual');
    const inputSchema = body?.schema || null;
    if (!id || !inputSchema) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    // Define base path based on scope
    let basePath = '/rest/v1/program_forms';
    if (scope === 'course') basePath = '/rest/v1/course_forms';
    if (scope === 'skill') basePath = '/rest/v1/skill_forms';

    // Ensure schema title matches program/course/skill title
    let finalSchema = { ...inputSchema };
    if (scope === 'program') {
      const progRes = await fetch(`${supabaseUrl}/rest/v1/programs?id=eq.${id}&select=title`, {
        headers: { apikey: service as string, Authorization: `Bearer ${service}` }, cache: 'no-store'
      });
      if (progRes.ok) {
        const arr = await progRes.json();
        const progTitle = arr?.[0]?.title as string | undefined;
        if (progTitle) {
          const desired = `Register for ${progTitle}`;
          if (!finalSchema?.title || finalSchema.title !== desired) {
            finalSchema = { ...finalSchema, title: desired };
          }
        }
      }
    } else if (scope === 'skill') {
      const skillRes = await fetch(`${supabaseUrl}/rest/v1/skills?id=eq.${id}&select=title`, {
        headers: { apikey: service as string, Authorization: `Bearer ${service}` }, cache: 'no-store'
      });
      if (skillRes.ok) {
        const arr = await skillRes.json();
        const skillTitle = arr?.[0]?.title as string | undefined;
        if (skillTitle) {
          const desired = `Register for ${skillTitle}`;
          if (!finalSchema?.title || finalSchema.title !== desired) {
            finalSchema = { ...finalSchema, title: desired };
          }
        }
      }
    }

    let payload: any = { form_type, schema: finalSchema };
    if (scope === 'program') payload.program_id = id;
    else if (scope === 'course') payload.course_id = id;
    else if (scope === 'skill') payload.skill_id = id;

    // 1) Check if a form row already exists (use service role for robustness)
    let queryParams = `?select=id&form_type=eq.${encodeURIComponent(form_type)}`;
    if (scope === 'program') queryParams += `&program_id=eq.${id}`;
    else if (scope === 'course') queryParams += `&course_id=eq.${id}`;
    else if (scope === 'skill') queryParams += `&skill_id=eq.${id}`;

    const existsRes = await fetch(`${supabaseUrl}${basePath}${queryParams}`, {
      headers: {
        apikey: service as string,
        Authorization: `Bearer ${service}`,
      },
      cache: 'no-store',
    });

    if (existsRes.ok) {
      const arr = await existsRes.json();
      const existingId = Array.isArray(arr) && arr.length > 0 ? arr[0].id : null;
      if (existingId) {
        // 2a) Update existing via PATCH
        const updateRes = await fetch(`${supabaseUrl}${basePath}?id=eq.${existingId}`, {
          method: 'PATCH',
          headers: {
            apikey: service as string,
            Authorization: `Bearer ${service}`,
            'content-type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({ schema: finalSchema }),
        });
        if (!updateRes.ok) {
          const t = await updateRes.text();
          return NextResponse.json({ error: 'upsert_failed', details: t }, { status: 500 });
        }
        return NextResponse.json({ ok: true });
      }
    }

    // 2b) Insert new row
    let onConflict = 'program_id,form_type';
    if (scope === 'course') onConflict = 'course_id,form_type';
    if (scope === 'skill') onConflict = 'skill_id,form_type'; // Assuming same constraint naming convention

    const insertRes = await fetch(`${supabaseUrl}${basePath}?on_conflict=${onConflict}`, {
      method: 'POST',
      headers: {
        apikey: service as string,
        Authorization: `Bearer ${service}`,
        'content-type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    });
    if (!insertRes.ok) {
      const t = await insertRes.text();
      return NextResponse.json({ error: 'upsert_failed', details: t }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'server_error' }, { status: 500 });
  }
}

