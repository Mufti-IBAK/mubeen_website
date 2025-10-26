"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface EnrollmentDetail {
  id: number;
  user_id: string;
  program_id: number;
  status: string | null;
  payment_status: string | null;
  amount: number | null;
  currency: string | null;
  transaction_id: string | null;
  plan_id: number | null;
  duration_months: number | null;
  classroom_link: string | null;
  classroom_enabled: boolean | null;
  form_data: Record<string, unknown> | null;
  created_at: string;
  is_family: boolean | null;
  family_size: number | null;
}

export default function ClientPage({ id }: { id: number }) {
  const [row, setRow] = useState<EnrollmentDetail | null>(null);
  const [program, setProgram] = useState<{ id: number; title: string } | null>(null);
  const [profile, setProfile] = useState<{ id: string; full_name: string | null; email: string | null } | null>(null);
  const [link, setLink] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setMessage('');
    const { data } = await supabase
      .from('enrollments')
      .select('id,user_id,program_id,status,payment_status,amount,currency,transaction_id,plan_id,duration_months,classroom_link,classroom_enabled,form_data,created_at,is_family,family_size')
      .eq('id', id)
      .maybeSingle();
    const r = (data as any) as EnrollmentDetail | null;
    setRow(r);
    if (r) {
      setLink(r.classroom_link || '');
      setEnabled(!!r.classroom_enabled);
      const [{ data: prog }, { data: prof }] = await Promise.all([
        supabase.from('programs').select('id,title').eq('id', r.program_id).single(),
        supabase.from('profiles').select('id,full_name,email').eq('id', r.user_id).single(),
      ]);
      setProgram((prog as any) || null);
      setProfile((prof as any) || null);
    }
  };

  useEffect(() => { load(); }, [id]);

  const accept = async () => {
    if (!row) return;
    await supabase.from('enrollments').update({ status: 'registered' }).eq('id', row.id);
    setMessage('Enrollment accepted');
    load();
  };
  const reject = async () => {
    if (!row) return;
    await supabase.from('enrollments').update({ status: 'rejected' }).eq('id', row.id);
    setMessage('Enrollment rejected');
    load();
  };
  const remove = async () => {
    if (!row) return;
    if (!confirm('Delete this enrollment?')) return;
    await supabase.from('enrollments').delete().eq('id', row.id);
    setMessage('Enrollment deleted');
  };

  const saveLink = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase.from('enrollments').update({ classroom_link: link.trim() }).eq('id', row.id);
    setSaving(false);
    setMessage(error ? error.message : 'Saved');
    if (!error) load();
  };
  const toggleEnabled = async () => {
    if (!row) return;
    const { error } = await supabase.from('enrollments').update({ classroom_enabled: !enabled }).eq('id', row.id);
    setMessage(error ? error.message : (!enabled ? 'Enabled' : 'Disabled'));
    if (!error) { setEnabled(!enabled); }
  };

  const download = () => {
    if (!row?.form_data) return;
    const blob = new Blob([JSON.stringify(row.form_data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `enrollment_${row.id}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!row) return <div className="text-[hsl(var(--muted-foreground))]">Loading…</div>;

  const category = row.is_family ? `Family of ${row.family_size || '?'}` : 'Individual';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Enrollment #{row.id}</h1>
        <span className={`badge ${row.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'}`}>{row.payment_status}</span>
      </div>
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Student</p>
            <p className="font-semibold">{profile?.full_name || profile?.email || 'Unknown'}</p>
            <p className="text-sm">{profile?.email || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Program</p>
            <p className="font-semibold">{program?.title || `Program ${row.program_id}`}</p>
            <p className="text-sm">{category}</p>
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Amount</p>
            <p className="font-semibold">{row.currency || 'NGN'} {row.amount ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Status</p>
            <p className="font-semibold">{row.status || 'pending'}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body space-y-3">
          <h2 className="text-lg font-semibold">Actions</h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={accept}>Accept</button>
            <button className="btn-outline" onClick={reject}>Reject</button>
            <button className="btn-destructive" onClick={remove}>Delete</button>
          </div>
          {message && <p className="text-sm text-[hsl(var(--muted-foreground))]">{message}</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-body space-y-3">
          <h2 className="text-lg font-semibold">Classroom Access</h2>
          <div className="flex items-center gap-2">
            <input className="input flex-1" aria-label="Classroom link" placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
            <button className="btn-outline" onClick={saveLink} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="btn-outline" onClick={toggleEnabled}>{enabled ? 'Disable' : 'Enable'}</button>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">When enabled, students will see a Classroom button in their dashboard.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Submission</h2>
            <button className="btn-outline" onClick={download}>Download JSON</button>
          </div>
          {row.form_data ? (
            <pre className="mt-2 max-h-96 overflow-auto rounded bg-[hsl(var(--muted))] p-3 text-xs text-[hsl(var(--foreground))]">{JSON.stringify(row.form_data, null, 2)}</pre>
          ) : (
            <p className="text-[hsl(var(--muted-foreground))]">No submission data.</p>
          )}
        </div>
      </div>
    </div>
  );
}