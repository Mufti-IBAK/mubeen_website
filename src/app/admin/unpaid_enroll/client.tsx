"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function UnpaidClient() {
  const [groups, setGroups] = useState<Array<{ user_id: string|null; user_name: string; user_email: string; count: number; latest: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { full_name?: string | null; phone?: string | null }>>({});
  const [exporting, setExporting] = useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch('/api/admin/unpaid-enroll/all', { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    const json = await res.json().catch(() => ({}));
    const groupsData = (json.items || []) as typeof groups;
    setGroups(groupsData);

    const ids = Array.from(new Set(groupsData.map((g) => g.user_id).filter((id): id is string => typeof id === 'string')));
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

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportCsv = React.useCallback(() => {
    if (!groups.length) return;
    try {
      setExporting(true);
      const header = ['Full Name', 'Email', 'Phone', 'Unpaid Count', 'Latest Unpaid'];
      const lines: string[][] = [header];
      groups.forEach((g) => {
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
      a.download = 'unpaid-enrollments-contacts.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [groups, profiles]);

  if (loading) return <div className="card"><div className="card-body">Loading…</div></div>;

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={exportCsv}
          className="btn-outline"
          disabled={!groups.length || exporting}
          aria-label="Download unpaid enrollment contacts as CSV"
        >
          {exporting ? 'Preparing CSV…' : 'Download contacts (CSV)'}
        </button>
        <button onClick={() => { setRefreshing(true); load(); }} className="btn-outline" disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {groups.length === 0 ? (
        <div className="col-span-full text-center text-[hsl(var(--muted-foreground))]">No unpaid enrollments.</div>
      ) : (
        groups.map((g, idx) => {
          const keySafe = `${g.user_id ?? 'null'}|${g.user_email ?? 'null'}|${g.latest}`;
          const linkId = g.user_id ? g.user_id : (g.user_email ? encodeURIComponent(g.user_email) : 'unknown-null');
          return (
            <div key={keySafe || String(idx)} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
              <h3 className="text-lg font-semibold">{g.user_name || '—'}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{g.user_email || '—'}</p>
              <p className="mt-2 text-sm"><span className="font-medium">Unpaid:</span> {g.count}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Last: {new Date(g.latest).toLocaleDateString()}</p>
              <Link className="btn-outline mt-3 inline-block" href={`/admin/unpaid_enroll/${linkId}`}>View Details</Link>
            </div>
          );
        })
      )}
      </div>
    </div>
  );
}
