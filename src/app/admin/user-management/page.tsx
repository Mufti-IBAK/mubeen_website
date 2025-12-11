import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import UserListClient from './user-list-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function UserManagementPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }); } catch {} },
        remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
      }
    }
  );

  // Admin access is enforced by the admin layout gate. We do not hard-block here to avoid SSR cookie hiccups.

  // Load users via REST (requires SUPABASE_SERVICE_ROLE_KEY in env)
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!baseUrl || !serviceKey) {
    return (
      <div className="card">
        <div className="card-body">
          <h2 className="text-xl font-semibold mb-2">Admin configuration required</h2>
          <p className="text-[hsl(var(--muted-foreground))]">Set SUPABASE_SERVICE_ROLE_KEY in your environment variables to use User Management.</p>
        </div>
      </div>
    );
  }

  const usersUrl = new URL('auth/v1/admin/users', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  usersUrl.searchParams.set('per_page', '200');
  usersUrl.searchParams.set('page', '1');

  const r = await fetch(usersUrl.toString(), {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!r.ok) {
    const text = await r.text();
    console.error('List users failed:', r.status, text);
    return <p className="text-red-500">Failed to load users.</p>;
  }
  const data = await r.json();
  type SupabaseAuthUser = { id: string; email?: string; created_at?: string };
  const raw = (data?.users ?? data ?? []) as SupabaseAuthUser[];
  const users = raw.map(u => ({ id: u.id, email: u.email || '', created_at: u.created_at || '' }));

  // Fetch roles and contact info from profiles
  const { data: profileRows } = await supabase.from('profiles').select('id, role, full_name, phone, whatsapp_number, email');
  const profileMap = new Map((profileRows || []).map((r: any) => [r.id, r]));
  const usersWithRoles = users.map((u) => {
    const prof = profileMap.get(u.id) as { role?: string; full_name?: string | null; phone?: string | null; whatsapp_number?: string | null } | undefined;
    return {
      ...u,
      role: prof?.role || 'student',
      full_name: prof?.full_name || '',
      phone: prof?.phone || '',
      whatsapp_number: prof?.whatsapp_number || '',
    };
  });

  // Apply filters from searchParams (Next 15 Promise)
  const sp = await searchParams;
  const q = (sp?.q as string | undefined)?.toLowerCase()?.trim() || '';
  const roleFilter = (sp?.role as string | undefined) || 'all';
  let filtered = usersWithRoles;
  if (q) filtered = filtered.filter(u => (u.email || '').toLowerCase().includes(q));
  if (roleFilter !== 'all') filtered = filtered.filter(u => u.role === roleFilter);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-body">
          <h1 className="text-2xl font-bold mb-1">User Management</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Assign roles and manage account access.</p>
        </div>
      </div>
      <UserListClient users={filtered} />
    </div>
  );
}

