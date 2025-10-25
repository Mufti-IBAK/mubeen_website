"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Enrollment {
  id: number;
  user_id: string;
  program_id: number;
  status: string | null;
  payment_status: string | null;
  amount: number | null;
  currency: string | null;
  transaction_id: string | null;
  form_data: Record<string, unknown> | null;
  classroom_link?: string | null;
  defer_active?: boolean | null;
  completed_at?: string | null;
  created_at: string;
  is_draft?: boolean | null;
}
interface Profile { id: string; full_name: string | null; email: string | null; }
interface Program { id: number; title: string; }

export default function RegistrationsByProgramClient({ programId }: { programId: number }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [emailOnPayment, setEmailOnPayment] = useState(false);
  const [classroomInputs, setClassroomInputs] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    const { data: prog } = await supabase.from('programs').select('id, title').eq('id', programId).single();
    setProgram((prog as Program) || null);

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch(`/api/admin/enrollments/by-program?program_id=${programId}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (res.ok) {
      const json = await res.json();
      const items = (json.items || []) as Enrollment[];
      const profs = (json.profiles || {}) as Record<string, Profile>;
      setEnrollments(items);
      setProfiles(profs);
      const inputs: Record<number, string> = {};
      items.forEach((row) => { inputs[row.id] = row.classroom_link || ''; });
      setClassroomInputs(inputs);
    } else {
      setEnrollments([]);
      setProfiles({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [programId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enrollments.filter(e => {
      const p = profiles[e.user_id];
      const name = (p?.full_name || '').toLowerCase();
      const email = (p?.email || '').toLowerCase();
      if (!q) return true;
      return name.includes(q) || email.includes(q);
    });
  }, [enrollments, profiles, search]);

  const setPayment = async (id: number, payment_status: string) => {
    if (payment_status === 'refunded') {
      // Attempt Flutterwave refund via server route, fallback to DB flip
      const rSel = await supabase.from('enrollments').select('transaction_id,amount').eq('id', id).maybeSingle();
      const tx = (rSel.data as any)?.transaction_id as string | null;
      const amt = (rSel.data as any)?.amount as number | null;
      if (tx) {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        const res = await fetch('/api/admin/refund', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ enrollment_id: id, transaction_id: tx, amount: amt || undefined }) });
        if (!res.ok) { const msg = await res.text().catch(() => 'Refund failed'); alert(msg || 'Refund failed'); return; }
      } else {
        await supabase.from('enrollments').update({ payment_status: 'refunded' }).eq('id', id);
      }
      setEnrollments(prev => prev.map(e => e.id === id ? { ...e, payment_status: 'refunded' } : e));
      return;
    }
    await supabase.from('enrollments').update({ payment_status }).eq('id', id);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, payment_status } : e));
    if (payment_status === 'paid' && emailOnPayment) {
      const row = enrollments.find(e => e.id === id);
      const email = row ? profiles[row.user_id]?.email : undefined;
      if (email) {
        await fetch('/api/admin/send-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: email, subject: 'Payment received — Mubeen Academy', html: `<p>Assalamu 'alaykum,</p><p>Your payment for <strong>${program?.title || 'Program'}</strong> has been received. You will find your classroom link in your dashboard when available.</p><p>JazakAllah Khair,<br/>Mubeen Academy</p>` })
        });
      }
    }
  };
  const setDeferred = async (id: number, defer_active: boolean) => {
    await supabase.from('enrollments').update({ defer_active }).eq('id', id);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, defer_active } : e));
  };
  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url;
    return `https://${url}`;
  };
  const saveClassroomLink = async (id: number) => {
    const raw = classroomInputs[id] || '';
    const url = ensureAbsoluteUrl(raw.trim());
    const { error } = await supabase.from('enrollments').update({ classroom_link: url }).eq('id', id);
    if (!error) {
      setEnrollments(prev => prev.map(e => e.id === id ? { ...e, classroom_link: url } : e));
      setClassroomInputs(prev => ({ ...prev, [id]: url }));
    } else {
      alert(error.message || 'Failed to save classroom link');
    }
  };
  const markCompleted = async (id: number) => {
    const ts = new Date().toISOString();
    await supabase.from('enrollments').update({ completed_at: ts }).eq('id', id);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, completed_at: ts } : e));
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body flex flex-col md:flex-row md:items-center gap-3">
          <h2 className="text-lg font-semibold flex-1">{program?.title || `Program ${programId}`}</h2>
          <input className="input md:w-64" aria-label="Search name or email" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={emailOnPayment} onChange={(e) => setEmailOnPayment(e.target.checked)} />
            <span>Email student on Mark Paid</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-[hsl(var(--muted-foreground))]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-[hsl(var(--muted-foreground))]">No registrations for this program.</div>
        ) : (
          filtered.map((e) => {
            const profile = profiles[e.user_id];
            return (
              <div key={e.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{profile?.full_name || profile?.email || 'Unknown User'}</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{profile?.email || '—'}</p>
                  </div>
                  <span className={`badge ${e.payment_status === 'paid' ? 'bg-green-100 text-green-700' : e.payment_status === 'refunded' ? 'bg-yellow-100 text-yellow-700' : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'}`}>
                    {e.payment_status || 'pending'}
                  </span>
                </div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  <p><span className="font-medium text-[hsl(var(--foreground))]">Registered:</span> {new Date(e.created_at).toLocaleString()}</p>
                  {e.is_draft ? (
                    <p className="text-xs mt-1"><span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700">Incomplete registration</span></p>
                  ) : null}
                  <p><span className="font-medium text-[hsl(var(--foreground))]">Amount:</span> {e.currency || 'NGN'} {e.amount ?? '-'}</p>
                  {e.transaction_id && <p><span className="font-medium text-[hsl(var(--foreground))]">Transaction:</span> {e.transaction_id}</p>}
                  {e.defer_active ? <p className="text-xs mt-1"><span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Deferred</span></p> : null}
                  {e.completed_at ? <p className="text-xs mt-1"><span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700">Completed {new Date(e.completed_at).toLocaleDateString()}</span></p> : null}
                </div>
                <div className="mt-2">
                  <label className="block text-xs mb-1 text-[hsl(var(--foreground))]">Classroom link</label>
                  <div className="flex items-center gap-2">
                    <input className="input flex-1" placeholder="https://..." value={classroomInputs[e.id] ?? ''} onChange={(ev) => setClassroomInputs(prev => ({ ...prev, [e.id]: ev.target.value }))} />
                    <button className="btn-outline" onClick={() => saveClassroomLink(e.id)}>Save</button>
                  </div>
                </div>
                {e.form_data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-[hsl(var(--foreground))]">View submission</summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-[hsl(var(--muted))] p-3 text-xs text-[hsl(var(--foreground))]">{JSON.stringify(e.form_data, null, 2)}</pre>
                  </details>
                )}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button className="btn-outline" onClick={() => setPayment(e.id, e.payment_status === 'paid' ? 'refunded' : 'paid')} disabled={e.is_draft === true}>
                    {e.payment_status === 'paid' ? 'Refund' : 'Mark Paid'}
                  </button>
                  <button className="btn-outline" onClick={() => setDeferred(e.id, !e.defer_active)} disabled={e.is_draft === true}>{e.defer_active ? 'Resume' : 'Defer'}</button>
                  <button className="btn-outline" onClick={() => markCompleted(e.id)} disabled={!!e.completed_at || e.is_draft === true}>{e.completed_at ? 'Completed' : 'Mark Completed'}</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

