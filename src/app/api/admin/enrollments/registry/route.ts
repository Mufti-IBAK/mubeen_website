import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

function getEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v as string;
}

export async function GET(req: NextRequest) {
  try {
    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anon = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!service) throw new Error('Missing service role key');

    // Admin auth check
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    let accessToken: string | undefined = undefined;
    if (authHeader && /^Bearer\s+/i.test(authHeader)) accessToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!accessToken) {
      const c = await cookies();
      accessToken = c.get('sb-access-token')?.value || c.get('sb:token')?.value || undefined;
    }
    if (!accessToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const userRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    if (!userRes.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const user = await userRes.json();

    const profRes = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { apikey: service, Authorization: `Bearer ${service}` }, cache: 'no-store' });
    if (!profRes.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const prof = await profRes.json();
    const role = prof?.[0]?.role;
    if (!(role === 'admin' || role === 'super_admin')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const reqUrl = new URL(req.url);
    const page = parseInt(reqUrl.searchParams.get('page') || '1');
    const status = reqUrl.searchParams.get('status') || 'all';
    const program = reqUrl.searchParams.get('program') || 'all';
    const q = reqUrl.searchParams.get('q') || '';
    const perPage = 20;
    const limit = Math.max(1, Math.min(100, parseInt(reqUrl.searchParams.get('limit') || String(perPage))));
    const offset = (page - 1) * limit;

    const admin = createClient(url, service);
    
    let baseQuery = admin.from('enrollments').select('*', { count: 'exact' });

    // Status filter
    if (status === 'paid') {
      baseQuery = baseQuery.eq('payment_status', 'paid');
    } else if (status === 'pending') {
      baseQuery = baseQuery.eq('payment_status', 'unpaid').neq('status', 'cancelled');
    } else if (status === 'cancelled') {
      baseQuery = baseQuery.eq('status', 'cancelled');
    }

    // Program filter
    if (program !== 'all') {
      baseQuery = baseQuery.eq('program_id', parseInt(program));
    }

    // Search filter
    if (q) {
      baseQuery = baseQuery.or(`user_name.ilike.%${q}%,user_email.ilike.%${q}%`);
    }

    const { data, count, error } = await baseQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Fetch profile data for the users
    const items = data || [];
    if (items.length > 0) {
      const userIds = Array.from(new Set(items.map(i => i.user_id).filter(id => !!id)));
      const userEmails = Array.from(new Set(items.map(i => i.user_email).filter(e => !!e)));
      
      let profileData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: pById } = await admin.from('profiles').select('id, full_name, email, phone').in('id', userIds);
        if (pById) profileData = [...profileData, ...pById];
      }
      
      if (userEmails.length > 0) {
        const { data: pByEmail } = await admin.from('profiles').select('id, full_name, email, phone').in('email', userEmails);
        if (pByEmail) profileData = [...profileData, ...pByEmail];
      }
      
      // Deduplicate profiles
      const profileMap = new Map();
      profileData.forEach(p => {
        if (p.id) profileMap.set(`id:${p.id}`, p);
        if (p.email) profileMap.set(`email:${p.email.toLowerCase()}`, p);
      });

      items.forEach(item => {
        const pById = item.user_id ? profileMap.get(`id:${item.user_id}`) : null;
        const pByEmail = item.user_email ? profileMap.get(`email:${item.user_email.toLowerCase()}`) : null;
        item.profiles = pById || pByEmail || null;
      });
    }

    return NextResponse.json({
      items,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (e: any) {
    console.error('Master Registry API error:', e);
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
