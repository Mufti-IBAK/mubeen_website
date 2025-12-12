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
  defer_active?: boolean | null;
  completed_at?: string | null;
}

interface Program {
  id: number;
  title: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function ClientPage({ id }: { id: number }) {
  const [row, setRow] = useState<EnrollmentDetail | null>(null);
  const [program, setProgram] = useState<{ id: number; title: string } | null>(null);
  const [profile, setProfile] = useState<{ id: string; full_name: string | null; email: string | null } | null>(null);
  const [link, setLink] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const load = async () => {
    setMessage('');
    const { data } = await supabase
      .from('enrollments')
      .select('id,user_id,program_id,status,payment_status,amount,currency,transaction_id,plan_id,duration_months,classroom_link,classroom_enabled,form_data,created_at,is_family,family_size,defer_active,completed_at')
      .eq('id', id)
      .maybeSingle();
    const r = data as EnrollmentDetail | null;
    setRow(r);
    if (r) {
      setLink(r.classroom_link || '');
      setEnabled(!!r.classroom_enabled);
      const [{ data: prog }, { data: prof }] = await Promise.all([
        supabase.from('programs').select('id,title').eq('id', r.program_id).single(),
        supabase.from('profiles').select('id,full_name,email').eq('id', r.user_id).single(),
      ]);
      setProgram((prog as Program) || null);
      setProfile((prof as Profile) || null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessageType(type);
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const accept = async () => {
    if (!row) return;
    await supabase.from('enrollments').update({ status: 'registered' }).eq('id', row.id);
    showMessage('Enrollment accepted', 'success');
    load();
  };
  
  const reject = async () => {
    if (!row) return;
    await supabase.from('enrollments').update({ status: 'rejected' }).eq('id', row.id);
    showMessage('Enrollment rejected', 'info');
    load();
  };
  
  const remove = async () => {
    if (!row) return;
    if (!confirm('Delete this enrollment? This action cannot be undone.')) return;
    const { error } = await supabase.from('enrollments').delete().eq('id', row.id);
    if (error) {
      showMessage('Error deleting enrollment: ' + error.message, 'error');
    } else {
      showMessage('Enrollment deleted successfully', 'success');
      setTimeout(() => window.history.back(), 1500);
    }
  };

  const saveLink = async () => {
    if (!row) return;
    setSaving(true);
    const trimmedLink = link.trim();
    const { error } = await supabase.from('enrollments').update({ classroom_link: trimmedLink }).eq('id', row.id);
    setSaving(false);
    if (error) {
      showMessage('Error saving classroom link: ' + error.message, 'error');
    } else {
      setLink(trimmedLink);
      showMessage('Classroom link saved successfully', 'success');
      load();
    }
  };
  
  const toggleEnabled = async () => {
    if (!row) return;
    const newState = !enabled;
    const { error } = await supabase.from('enrollments').update({ classroom_enabled: newState }).eq('id', row.id);
    if (error) {
      showMessage('Error updating classroom access: ' + error.message, 'error');
    } else {
      setEnabled(newState);
      showMessage(newState ? 'Classroom access enabled' : 'Classroom access disabled', 'success');
    }
  };

  const downloadSubmission = () => {
    if (!row?.form_data) {
      showMessage('No submission data available', 'info');
      return;
    }
    try {
      const blob = new Blob([JSON.stringify(row.form_data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enrollment_${row.id}_submission.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('Submission downloaded successfully', 'success');
    } catch (_err) {
      showMessage('Error downloading submission', 'error');
    }
  };

  if (!row) return <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">Loading…</div>;

  const category = row.is_family ? `Family of ${row.family_size || '?'}` : 'Individual';
  const isPaymentConfirmed = row.payment_status === 'paid';
  const hasSubmission = !!row.form_data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enrollment #{row.id}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Enrolled: {new Date(row.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${isPaymentConfirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {row.payment_status || 'unpaid'}
          </span>
          <span className="badge bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
            {category}
          </span>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className={`rounded-lg p-4 ${
          messageType === 'success' ? 'bg-green-100 text-green-800' :
          messageType === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`} role="status" aria-live="polite">
          {message}
        </div>
      )}

      {/* Student & Program Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4">Student Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Full Name</p>
                <p className="font-medium">{profile?.full_name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Email</p>
                <p className="font-medium">{profile?.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Registration Type</p>
                <p className="font-medium">{category}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 className="text-lg font-semibold mb-4">Program & Payment</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Program</p>
                <p className="font-medium">{program?.title || `Program ${row.program_id}`}</p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Amount Paid</p>
                <p className="font-medium">{row.currency || 'NGN'} {row.amount ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Payment Status</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  isPaymentConfirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {isPaymentConfirmed ? 'Paid (Confirmed by Flutterwave)' : 'Unpaid'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Actions */}
      <div className="card">
        <div className="card-body">
          <h2 className="text-lg font-semibold mb-4">Enrollment Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button 
              className="btn-primary" 
              onClick={accept}
              aria-label="Accept this enrollment"
            >
              Accept Enrollment
            </button>
            <button 
              className="btn-outline" 
              onClick={reject}
              aria-label="Reject this enrollment"
            >
              Reject Enrollment
            </button>
            <button 
              className="btn-destructive" 
              onClick={remove}
              aria-label="Delete this enrollment permanently"
            >
              Delete Enrollment
            </button>
          </div>
        </div>
      </div>

      {/* Classroom Link Management */}
      <div className="card">
        <div className="card-body">
          <h2 className="text-lg font-semibold mb-4">Classroom Link Management</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            Set a classroom link to grant students access to the learning platform. When enabled, students will see a &quot;Join Classroom&quot; button on their dashboard.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="url"
                className="input flex-1"
                aria-label="Classroom link URL"
                placeholder="https://meet.google.com/xxx or https://zoom.us/j/xxx"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
              <button
                className="btn-outline"
                onClick={saveLink}
                disabled={saving}
                aria-label="Save classroom link"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={toggleEnabled}
                  aria-label="Enable or disable classroom access for this student"
                />
                <span className="text-sm font-medium">
                  {enabled ? '✓ Classroom access enabled' : 'Classroom access disabled'}
                </span>
              </label>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] pt-2">
              {enabled && link 
                ? 'Student will see the classroom link on their dashboard'
                : 'Save and enable a link to allow student access'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Submission Data */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Enrollment Submission</h2>
            <button
              className="btn-outline"
              onClick={downloadSubmission}
              disabled={!hasSubmission}
              aria-label="Download submission as JSON file"
            >
              Download JSON
            </button>
          </div>
          {hasSubmission ? (
            <div className="space-y-3">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Submitted form data:</p>
              <pre className="max-h-96 overflow-auto rounded bg-[hsl(var(--muted))] p-4 text-xs text-[hsl(var(--foreground))] border border-[hsl(var(--border))]" aria-label="Enrollment form submission data">
                {JSON.stringify(row.form_data, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-[hsl(var(--muted-foreground))] py-8 text-center">No submission data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
