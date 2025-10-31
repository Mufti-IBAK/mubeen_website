import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Helper to get environment variable with fallback
 */
function getEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

/**
 * Extract access token from request headers or cookies
 */
async function readAccessToken(req: NextRequest) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) return header.slice(7);
  const cookieStore = await cookies();
  return cookieStore.get('sb-access-token')?.value || cookieStore.get('sb:token')?.value;
}

/**
 * Verify if the current user is an admin
 */
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
  
  // Check if user has admin role using service key
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (service) {
    const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
      headers: { apikey: service as string, Authorization: `Bearer ${service}` },
      cache: 'no-store',
    });
    if (profRes.ok) {
      const prof = await profRes.json();
      if (prof?.[0]?.role === 'admin' || prof?.[0]?.role === 'super_admin') return { user, service };
    }
  }
  return false;
}

/**
 * POST /api/admin/class-links/upsert
 * Create or update a classroom link for an enrollment
 * Body: { enrollment_id: number, classroom_link: string }
 */
export async function POST(req: NextRequest) {
  try {
    const adminData = await isAdminFromRequest(req);
    if (!adminData) {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { enrollment_id, classroom_link } = body;

    // Validate required fields
    if (!enrollment_id || typeof enrollment_id !== 'number') {
      return NextResponse.json({ error: 'Invalid enrollment_id' }, { status: 400 });
    }

    // Allow empty string to delete the link
    if (typeof classroom_link !== 'string') {
      return NextResponse.json({ error: 'Invalid classroom_link' }, { status: 400 });
    }

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const service = adminData.service;

    // If classroom_link is empty, delete the existing link
    if (classroom_link.trim() === '') {
      const deleteRes = await fetch(`${supabaseUrl}/rest/v1/class_links?enrollment_id=eq.${enrollment_id}`, {
        method: 'DELETE',
        headers: {
          apikey: service as string,
          Authorization: `Bearer ${service}`,
          'content-type': 'application/json',
        },
      });
      
      if (!deleteRes.ok && deleteRes.status !== 404) {
        const errorText = await deleteRes.text();
        return NextResponse.json({ error: 'Failed to delete link', details: errorText }, { status: 500 });
      }
      
      return NextResponse.json({ ok: true, deleted: true });
    }

    // Get enrollment details (user_id and program_id) from success_enroll
    const enrollRes = await fetch(`${supabaseUrl}/rest/v1/success_enroll?id=eq.${enrollment_id}&select=user_id,program_id`, {
      headers: {
        apikey: service as string,
        Authorization: `Bearer ${service}`,
      },
      cache: 'no-store',
    });

    if (!enrollRes.ok) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const enrollments = await enrollRes.json();
    const enrollment = enrollments?.[0];
    
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Check if link already exists
    const existingRes = await fetch(`${supabaseUrl}/rest/v1/class_links?enrollment_id=eq.${enrollment_id}&select=id`, {
      headers: {
        apikey: service as string,
        Authorization: `Bearer ${service}`,
      },
      cache: 'no-store',
    });

    if (!existingRes.ok) {
      return NextResponse.json({ error: 'Failed to check existing link' }, { status: 500 });
    }

    const existing = await existingRes.json();
    const existingId = existing?.[0]?.id;

    if (existingId) {
      // Update existing link
      const updateRes = await fetch(`${supabaseUrl}/rest/v1/class_links?id=eq.${existingId}`, {
        method: 'PATCH',
        headers: {
          apikey: service as string,
          Authorization: `Bearer ${service}`,
          'content-type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          classroom_link: classroom_link.trim(),
          updated_by: adminData.user.id,
        }),
      });

      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        return NextResponse.json({ error: 'Failed to update link', details: errorText }, { status: 500 });
      }

      const updated = await updateRes.json();
      return NextResponse.json({ ok: true, data: updated[0] });
    } else {
      // Insert new link
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/class_links`, {
        method: 'POST',
        headers: {
          apikey: service as string,
          Authorization: `Bearer ${service}`,
          'content-type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          enrollment_id,
          user_id: enrollment.user_id,
          program_id: enrollment.program_id,
          classroom_link: classroom_link.trim(),
          created_by: adminData.user.id,
          updated_by: adminData.user.id,
        }),
      });

      if (!insertRes.ok) {
        const errorText = await insertRes.text();
        return NextResponse.json({ error: 'Failed to create link', details: errorText }, { status: 500 });
      }

      const inserted = await insertRes.json();
      return NextResponse.json({ ok: true, data: inserted[0] });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Class link upsert error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
