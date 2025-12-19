"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function RegistrationsClient() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [grouped, setGrouped] = useState<{ user_id: string|null; user_name: string; user_email: string; count: number; latest: string }[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name?: string | null; phone?: string | null }>>({});
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(`/api/admin/registrations/all?page=${page}&limit=50`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      const groups = (json.items || []) as typeof grouped;
      setGrouped(groups);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || 0);

      // Load profile data (full_name, phone) for users in these groups
      const ids = Array.from(new Set(groups.map((g) => g.user_id).filter((id): id is string => typeof id === 'string')));
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, phone').in('id', ids);
        const map: Record<string, { full_name?: string | null; phone?: string | null }> = {};
        (profs as Array<{ id: string; full_name?: string | null; phone?: string | null }> | null)?.forEach((p) => {
          map[p.id] = { full_name: p.full_name ?? null, phone: p.phone ?? null };
        });
        setProfiles(map);
      } else {
        setProfiles({});
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load, page]);

  const exportCsv = React.useCallback(() => {
    if (!grouped.length) return;
    try {
      setExporting(true);
      const header = ['Full Name', 'Email', 'Phone', 'Programs Count', 'Latest Registration'];
      const lines: string[][] = [header];
      grouped.forEach((g) => {
        const prof = g.user_id ? profiles[g.user_id || ''] : undefined;
        const name = (prof?.full_name || g.user_name || '').toString();
        const phone = (prof?.phone || '').toString();
        const email = (g.user_email || '').toString();
        const countStr = String(g.count ?? '');
        const latestStr = g.latest ? new Date(g.latest).toISOString() : '';
        const cols = [name, email, phone, countStr, latestStr];
        lines.push(cols);
      });
      const csv = lines
        .map((cols) =>
          cols
            .map((value) => {
              const v = String(value ?? '');
              if (/[",\n]/.test(v)) {
                return `"${v.replace(/"/g, '""')}"`;
              }
              return v;
            })
            .join(','),
        )
        .join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'registered-users-contacts.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [grouped, profiles]);

  if (loading) return <div className="card"><div className="card-body">Loading…</div></div>;

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={exportCsv}
          className="btn-outline"
          disabled={!grouped.length || exporting}
          aria-label="Download registered user contacts as CSV"
        >
          {exporting ? 'Preparing CSV…' : 'Download contacts (CSV)'}
        </button>
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
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold truncate flex-1 mr-2">{g.user_name || '—'}</h3>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    (g as any).status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {(g as any).status || 'pending'}
                  </span>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">{g.user_email || '—'}</p>
                
                <div className="space-y-1">
                  <p className="text-sm"><span className="font-medium">Total Courses:</span> {g.count}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Latest: {new Date(g.latest).toLocaleDateString()}</p>
                </div>

                <Link className="btn-outline w-full mt-4 text-center py-2" href={`/admin/registrations/user/${linkId}`}>
                  Management Details
                </Link>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="btn-outline px-6 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="btn-outline px-6 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
