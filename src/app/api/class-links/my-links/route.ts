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
 * GET /api/class-links/my-links
 * Fetch classroom links for the authenticated user's paid enrollments
 * Returns: Array of {enrollment_id, program_id, classroom_link}
 */
export async function GET(req: NextRequest) {
  try {
    const accessToken = await readAccessToken(req);
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);

    // Get current user
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await userRes.json();

    // Fetch class links for this user
    // RLS policy will automatically filter to only this user's links
    const linksRes = await fetch(`${supabaseUrl}/rest/v1/class_links?user_id=eq.${user.id}&select=enrollment_id,program_id,classroom_link`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!linksRes.ok) {
      const errorText = await linksRes.text();
      console.error('Failed to fetch class links:', errorText);
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
    }

    const links = await linksRes.json();
    
    // Return as a map for easy lookup by enrollment_id
    const linksMap: Record<number, string> = {};
    (links as Array<{enrollment_id: number; classroom_link: string}>).forEach(link => {
      linksMap[link.enrollment_id] = link.classroom_link;
    });

    return NextResponse.json({ ok: true, links: linksMap });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Fetch class links error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
