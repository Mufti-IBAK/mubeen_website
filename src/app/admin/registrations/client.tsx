"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { FiUsers, FiUser, FiEye } from "react-icons/fi";

// Types (adjust to your schema)
interface Enrollment {
  id: number;
  user_id: string;
  program_id: number;
  status: string | null; // e.g., 'registered'
  payment_status: string | null; // e.g., 'paid','pending','refunded'
  amount: number | null;
  currency: string | null;
  transaction_id: string | null;
  form_data: Record<string, unknown> | null;
  classroom_link: string | null;
  defer_active?: boolean | null;
  completed_at?: string | null;
  created_at: string;
  is_family?: boolean | null;
  family_size?: number | null;
  family_group_id?: number | null;
  registration_type?: 'individual' | 'family_head' | 'family_member';
}
// Items returned to UI can include derived flags (drafts and family grouping)
type DisplayItem = Enrollment & { is_draft?: boolean; _isFamily?: boolean };
interface Program { id: number; title: string; }
interface Profile { id: string; full_name: string | null; email: string | null; }

export default function RegistrationsClient() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState<number | 'all'>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'pending' | 'refunded'>('all');
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTargetProgram, setBulkTargetProgram] = useState<number | ''>('');
  const [emailOnPayment, setEmailOnPayment] = useState(false);
  const [classroomInputs, setClassroomInputs] = useState<Record<number, string>>({});
  const [savedMap, setSavedMap] = useState<Record<number, boolean>>({});

  const load = async () => {
    setLoading(true);
    // Fetch programs for filters and transfers
    const { data: progs } = await supabase.from('programs').select('id, title').order('title');
    setPrograms((progs as Program[]) || []);

    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch('/api/admin/enrollments/all', { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (res.ok) {
      const json = await res.json();
      const items: DisplayItem[] = (json.items || []) as DisplayItem[];
      setEnrollments(items);
      setProfiles(json.profiles || {});
      const inputs: Record<number, string> = {};
      items.forEach((row) => { inputs[row.id] = row.classroom_link || ''; });
      setClassroomInputs(inputs);
    } else {
      setEnrollments([]);
      setProfiles({});
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return enrollments.filter(e => {
      if (filterProgram !== 'all' && e.program_id !== filterProgram) return false;
      if (filterPayment !== 'all' && (e.payment_status || 'pending') !== filterPayment) return false;
      const p = profiles[e.user_id];
      const name = (p?.full_name || '').toLowerCase();
      const email = (p?.email || '').toLowerCase();
      const q = search.toLowerCase();
      if (!q) return true;
      return name.includes(q) || email.includes(q);
    });
  }, [enrollments, filterProgram, filterPayment, profiles, search]);

  // Group family enrollments - show only family heads, hide individual family members
  const displayItems = useMemo(() => {
    const familyGroups = new Map<string, Enrollment[]>();
    const individuals: Enrollment[] = [];
    
    filtered.forEach(enrollment => {
      if (enrollment.is_family && enrollment.registration_type === 'family_head') {
        // Group by user-program
        const key = `${enrollment.user_id}-${enrollment.program_id}`;
        const current = familyGroups.get(key) || [];
        if (!familyGroups.has(key)) familyGroups.set(key, current);
        current.push(enrollment);
      } else if (!enrollment.is_family || enrollment.registration_type !== 'family_member') {
        individuals.push(enrollment);
      }
      // Skip family_member registrations
    });
    
    // Convert family groups to display items
    const familyItems: DisplayItem[] = Array.from(familyGroups.entries()).map(([, members]) => {
      const head = members[0]; // Family head
      return { ...head, _isFamily: true } as DisplayItem;
    });
    
    return [...familyItems, ...individuals];
  }, [filtered]);

  const programTitle = (id: number) => programs.find(p => p.id === id)?.title || `Program ${id}`;
  const resetSelection = () => setSelected(new Set());
  const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  const clearSelection = () => setSelected(new Set());
  const bulkMarkPaid = async () => {
    if (selected.size === 0) return;
    await fetch('/api/admin/enrollments/bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'mark_paid', ids: Array.from(selected) }) });
    setEnrollments(prev => prev.map(e => selected.has(e.id) ? { ...e, payment_status: 'paid' } : e));
    resetSelection();
  };
  const bulkRefund = async () => {
    if (selected.size === 0) return;
    await fetch('/api/admin/enrollments/bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'refund', ids: Array.from(selected) }) });
    setEnrollments(prev => prev.map(e => selected.has(e.id) ? { ...e, payment_status: 'refunded' } : e));
    resetSelection();
  };
  const bulkTransfer = async () => {
    if (selected.size === 0 || !bulkTargetProgram || typeof bulkTargetProgram !== 'number') return;
    await fetch('/api/admin/enrollments/bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'transfer', ids: Array.from(selected), target_program_id: bulkTargetProgram }) });
    setEnrollments(prev => prev.map(e => selected.has(e.id) ? { ...e, program_id: bulkTargetProgram } : e));
    resetSelection();
  };
  const bulkRemove = async () => {
    if (selected.size === 0) return;
    if (!confirm('Remove selected registrations?')) return;
    await Promise.all(Array.from(selected).map(id => supabase.from('enrollments').delete().eq('id', id)));
    setEnrollments(prev => prev.filter(e => !selected.has(e.id)));
    resetSelection();
  };

  const setPayment = async (id: number, payment_status: string, opts?: { transaction_id?: string; amount?: number }) => {
    if (payment_status === 'refunded') {
      // Call secure refund route
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ enrollment_id: id, transaction_id: opts?.transaction_id, amount: opts?.amount }),
      });
      if (!res.ok) {
        alert('Refund failed');
        return;
      }
      setEnrollments(prev => prev.map(e => e.id === id ? { ...e, payment_status: 'refunded' } : e));
      return;
    }
    await supabase.from('enrollments').update({ payment_status }).eq('id', id);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, payment_status } : e));
    if (payment_status === 'paid' && emailOnPayment) {
      const row = enrollments.find(e => e.id === id);
      const email = row ? profiles[row.user_id]?.email : undefined;
      const programTitleStr = row ? programTitle(row.program_id) : 'Program';
      if (email) {
        await fetch('/api/admin/send-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: email, subject: 'Payment received — Mubeen Academy', html: `<p>Assalamu 'alaykum,</p><p>Your payment for <strong>${programTitleStr}</strong> has been received. You will find your classroom link in your dashboard when available.</p><p>JazakAllah Khair,<br/>Mubeen Academy</p>` })
        });
      }
    }
  };
  const remove = async (id: number) => {
    if (!confirm('Remove this registration?')) return;
    await supabase.from('enrollments').delete().eq('id', id);
    setEnrollments(prev => prev.filter(e => e.id !== id));
  };
  const transfer = async (id: number, newProgramId: number) => {
    await supabase.from('enrollments').update({ program_id: newProgramId }).eq('id', id);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, program_id: newProgramId } : e));
  };
  const updateStatus = async (id: number, status: string) => {
    await supabase.from('enrollments').update({ status }).eq('id', id);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };
  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url;
    return `https://${url}`;
  };
  const setClassroom = async (id: number, raw: string) => {
    const classroom_link = ensureAbsoluteUrl((raw || '').trim());
    await supabase.from('enrollments').update({ classroom_link }).eq('id', id);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, classroom_link } : e));
    setClassroomInputs(prev => ({ ...prev, [id]: classroom_link }));
    setSavedMap(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setSavedMap(prev => ({ ...prev, [id]: false })), 1500);
  };
  const setDeferred = async (id: number, defer_active: boolean) => {
    await supabase.from('enrollments').update({ defer_active }).eq('id', id);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, defer_active } : e));
  };
  const markCompleted = async (id: number) => {
    const ts = new Date().toISOString();
    await supabase.from('enrollments').update({ completed_at: ts }).eq('id', id);
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, completed_at: ts } : e));
  };
  const saveSubmission = async (id: number, json: string) => {
    try {
      const parsed = JSON.parse(json);
      await supabase.from('enrollments').update({ form_data: parsed }).eq('id', id);
      setEnrollments(prev => prev.map(e => e.id === id ? { ...e, form_data: parsed } : e));
      alert('Saved');
    } catch {
      alert('Invalid JSON');
    }
  };
  // Reminder modal state
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTo, setReminderTo] = useState<string>('');
  const [reminderSubject, setReminderSubject] = useState<string>('Complete your registration — Mubeen Academy');
  const [reminderMessage, setReminderMessage] = useState<string>('Assalamu alaykum,\n\nPlease complete your registration.');
  const [sendingReminder, setSendingReminder] = useState(false);

  const openReminder = (to: string, programTitle: string) => {
    setReminderTo(to);
    setReminderSubject(`Complete your registration — ${programTitle}`);
    setReminderMessage(`Assalamu alaykum,\n\nPlease complete your registration for ${programTitle}. You can continue from your dashboard:\n${location.origin}/dashboard\n\nJazakAllah Khair,\nMubeen Academy`);
    setReminderOpen(true);
  };

  const sendReminder = async () => {
    if (!reminderTo) { alert('No email available for this user'); return; }
    setSendingReminder(true);
    try {
      await fetch('/api/admin/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: reminderTo, subject: reminderSubject, html: `<pre style=\"font-family:inherit;white-space:pre-wrap\">${reminderMessage}</pre>` })
      });
      setReminderOpen(false);
    } catch {
      alert('Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-5 gap-3">
          <input className="input" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" aria-label="Filter by program" value={filterProgram} onChange={(e) => setFilterProgram(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">All programs</option>
            {programs.map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}
          </select>
          <select className="input" aria-label="Filter by payment status" value={filterPayment} onChange={(e) => setFilterPayment(e.target.value as 'all'|'paid'|'pending'|'refunded')}>
            <option value="all">All payment statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={emailOnPayment} onChange={(e) => setEmailOnPayment(e.target.checked)} />
            <span>Email student on Mark Paid</span>
          </label>
          <button className="btn-outline" onClick={load}>Refresh</button>
        </div>
      </div>

      {/* Bulk toolbar (visible when any selected) */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 card">
          <div className="card-body flex flex-wrap items-center gap-3">
            <span className="text-sm">Selected: {selected.size}</span>
            <button className="btn-outline" onClick={bulkMarkPaid}>Mark Paid</button>
            <button className="btn-outline" onClick={bulkRefund}>Refund</button>
            <div className="flex items-center gap-2">
              <select className="input" aria-label="Bulk transfer target program" value={bulkTargetProgram} onChange={(e) => setBulkTargetProgram(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Transfer to…</option>
                {programs.map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}
              </select>
              <button className="btn-outline" onClick={bulkTransfer} disabled={!bulkTargetProgram}>Apply</button>
            </div>
            <button className="btn-destructive" onClick={bulkRemove}>Remove</button>
            <button className="btn-ghost" onClick={clearSelection}>Clear</button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : displayItems.length === 0 ? (
          <div className="col-span-full text-[hsl(var(--muted-foreground))]">No registrations match the filters.</div>
        ) : (
          displayItems.map((e: DisplayItem) => {
            const profile = profiles[e.user_id];
            const isFamily = e._isFamily || e.is_family;
            return (
              <div key={e.id} className={`rounded-xl border shadow-sm p-4 flex flex-col gap-3 ${
                isFamily 
                  ? 'border-blue-200 bg-blue-50/30' 
                  : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} />
                    <span>Select</span>
                  </label>
                  {isFamily && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <FiUsers className="h-4 w-4" />
                      <span className="text-xs font-medium">Family ({e.family_size || 'Unknown'} members)</span>
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isFamily ? <FiUsers className="h-4 w-4 text-blue-600 flex-shrink-0" /> : <FiUser className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                      <h3 className="font-semibold">{profile?.full_name || profile?.email || 'Unknown User'}</h3>
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] ml-6">{profile?.email || '—'}</p>
                    {isFamily && (
                      <p className="text-xs text-blue-600 ml-6 mt-1">Family Head - Payment covers all members</p>
                    )}
                  </div>
                  <span className={`badge ${e.payment_status === 'paid' ? 'bg-green-100 text-green-700' : e.payment_status === 'refunded' ? 'bg-yellow-100 text-yellow-700' : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'}`}>
                    {e.payment_status || 'pending'}
                  </span>
                </div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  <p><span className="font-medium text-[hsl(var(--foreground))]">Program:</span> {programTitle(e.program_id)}</p>
                  <p><span className="font-medium text-[hsl(var(--foreground))]">Registered:</span> {new Date(e.created_at).toLocaleString()}</p>
                  <p><span className="font-medium text-[hsl(var(--foreground))]">Amount:</span> {e.currency || 'NGN'} {e.amount ?? '-'}</p>
                  {e.transaction_id && <p><span className="font-medium text-[hsl(var(--foreground))]">Transaction:</span> {e.transaction_id}</p>}
                  {e.defer_active ? <p className="text-xs mt-1"><span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Deferred</span></p> : null}
                  {e.completed_at ? <p className="text-xs mt-1"><span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700">Completed {new Date(e.completed_at).toLocaleDateString()}</span></p> : null}
                </div>
              {isFamily ? (
                <div className="space-y-2">
                  {/* Family-specific actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-outline" onClick={() => setPayment(e.id, e.payment_status === 'paid' ? 'refunded' : 'paid', { transaction_id: e.transaction_id || undefined, amount: e.amount || undefined })}>
                      {e.payment_status === 'paid' ? 'Refund Family' : 'Mark Family Paid'}
                    </button>
                    <Link href={`/admin/registrations/family/${e.id}`} className="btn-primary flex items-center justify-center gap-2">
                      <FiEye className="h-4 w-4" />
                      View Family
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-outline" onClick={() => setDeferred(e.id, !e.defer_active)}>{e.defer_active ? 'Resume Family' : 'Defer Family'}</button>
                    <button className="btn-destructive" onClick={() => remove(e.id)}>Remove Family</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button className="btn-outline" onClick={() => setPayment(e.id, e.payment_status === 'paid' ? 'refunded' : 'paid', { transaction_id: e.transaction_id || undefined, amount: e.amount || undefined })} disabled={e.is_draft === true}>
                    {e.payment_status === 'paid' ? 'Refund' : 'Mark Paid'}
                  </button>
                  <button className="btn-outline" onClick={() => updateStatus(e.id, e.status === 'registered' ? 'updated' : 'registered')} disabled={e.is_draft === true}>
                    {e.status === 'registered' ? 'Mark Updated' : 'Mark Registered'}
                  </button>
                  <button className="btn-destructive" onClick={() => remove(e.id)} disabled={e.is_draft === true}>Remove</button>
                  <div className="flex items-center gap-2">
                    <select className="input" aria-label="Transfer this registration to another program" onChange={(ev) => transfer(e.id, Number(ev.target.value))} defaultValue="" disabled={e.is_draft === true}>
                      <option value="" disabled>Transfer to…</option>
                      {programs.filter(p => p.id !== e.program_id).map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-outline" onClick={() => openReminder(profiles[e.user_id]?.email || '', programTitle(e.program_id))}>Send reminder</button>
                  <button className="btn-outline" onClick={() => setDeferred(e.id, !e.defer_active)} disabled={e.is_draft === true}>{e.defer_active ? 'Resume' : 'Defer'}</button>
                  <button className="btn-outline" onClick={() => markCompleted(e.id)} disabled={!!e.completed_at || e.is_draft === true}>{e.completed_at ? 'Completed' : 'Mark Completed'}</button>
                </div>
              )}
              {/* Classroom link */}
              <div className="mt-2 flex items-center gap-2">
                <input className="input flex-1" placeholder="https://..." value={classroomInputs[e.id] ?? ''} onChange={(ev) => setClassroomInputs(prev => ({ ...prev, [e.id]: ev.target.value }))} />
                <button className="btn-outline" onClick={() => setClassroom(e.id, classroomInputs[e.id] ?? '')}>Save</button>
                {savedMap[e.id] ? <span className="text-xs text-[hsl(var(--muted-foreground))]">Saved</span> : null}
              </div>
              {/* Submission viewer/editor */}
              {e.form_data && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-[hsl(var(--foreground))]">View submission</summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded bg-[hsl(var(--muted))] p-3 text-xs text-[hsl(var(--foreground))]">{JSON.stringify(e.form_data, null, 2)}</pre>
                  <textarea className="mt-2 w-full textarea" placeholder="Edit JSON and click save" defaultValue={JSON.stringify(e.form_data, null, 2)} />
                  <button className="mt-2 btn-primary" onClick={(ev) => {
                    const ta = (ev.currentTarget.previousSibling as HTMLTextAreaElement);
                    saveSubmission(e.id, ta.value);
                  }}>Save</button>
                </details>
              )}
              </div>
            );
          })
        )}
      </div>

      <div className="text-xs text-[hsl(var(--muted-foreground))]">
        Tip: refunds here flip payment_status to &quot;refunded&quot;; wire your Flutterwave refund API in a server route to perform real refunds.
      </div>
    {/* Reminder Modal */}
    {reminderOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setReminderOpen(false)} />
        <div className="relative z-10 w-full max-w-lg card">
          <div className="card-body space-y-3">
            <h3 className="text-lg font-semibold">Send Reminder</h3>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              To: <span className="font-medium text-[hsl(var(--foreground))]">{reminderTo || 'No email'}</span>
            </div>
            <input className="input" placeholder="Subject" value={reminderSubject} onChange={(e) => setReminderSubject(e.target.value)} />
            <textarea className="textarea h-40" placeholder="Message" value={reminderMessage} onChange={(e) => setReminderMessage(e.target.value)} />
            <div className="flex items-center justify-end gap-2">
              <button className="btn-ghost" onClick={() => setReminderOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={sendReminder} disabled={sendingReminder || !reminderTo}>
                {sendingReminder ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

