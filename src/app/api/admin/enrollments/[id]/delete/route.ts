import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function isAdmin(req: NextRequest) {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    const c = await cookies();
    token = c.get('sb-access-token')?.value;
  }
  
  if (!token) return false;

  const admin = createClient(url, service!);
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return false;

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' || profile?.role === 'super_admin';
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
    }

    const params = await props.params;
    const id = parseInt(params.id);
    if (isNaN(id)) {
      console.error('Invalid ID received:', params.id);
      return NextResponse.json({ error: 'invalid_id', received: params.id }, { status: 400 });
    }

    const url = env('NEXT_PUBLIC_SUPABASE_URL');
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const admin = createClient(url, service!);

    const { error } = await admin.from('enrollments').delete().eq('id', id);
    
    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Deleted enrollment #${id}`);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Delete failed:', e);
    return NextResponse.json({ error: e.message || 'server_error' }, { status: 500 });
  }
}
