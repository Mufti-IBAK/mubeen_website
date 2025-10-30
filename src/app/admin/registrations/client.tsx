"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function RegistrationsClient() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [grouped, setGrouped] = useState<{ user_id: string|null; user_name: string; user_email: string; count: number; latest: string }[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch('/api/admin/registrations/success-enroll/all', { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      const groups = (json.items || []) as typeof grouped;
      setGrouped(groups);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card"><div className="card-body">Loading…</div></div>;

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <button onClick={() => { setRefreshing(true); load(); }} className="btn-outline" disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {grouped.length === 0 ? (
          <div className="col-span-full text-center text-[hsl(var(--muted-foreground))]">No registrations found.</div>
        ) : (
          grouped.map((g, idx) => {
            const keySafe = `${g.user_id ?? 'null'}|${g.user_email ?? 'null'}|${g.latest}`;
            const linkId = g.user_id ? g.user_id : (g.user_email ? encodeURIComponent(g.user_email) : 'unknown-null');
            return (
              <div key={keySafe || String(idx)} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
                <h3 className="text-lg font-semibold">{g.user_name || '—'}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{g.user_email || '—'}</p>
                <p className="mt-2 text-sm"><span className="font-medium">Programs:</span> {g.count}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Applied: {new Date(g.latest).toLocaleDateString()}</p>
                <Link className="btn-outline mt-3 inline-block" href={`/admin/registrations/user/${linkId}`}>View Details</Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
