'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FormRenderer } from '@/components/form-builder/FormRenderer';

type Program = { id: number; title: string; slug: string; description?: string };

export default function RegistrationFormClient({
  program,
}: {
  program: Program;
}) {
  const [authed, setAuthed] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        window.location.href = `/login?next=${encodeURIComponent(`/programs/${program.slug}/register`)}`;
        return;
      }
      setAuthed(true);
      // Load admin-built Individual form schema
      const { data } = await supabase
        .from('program_forms')
        .select('schema')
        .eq('program_id', program.id)
        .eq('form_type', 'individual')
        .maybeSingle();
      setSchema((data as any)?.schema || null);
      setLoading(false);
    })();
  }, [program.id, program.slug]);

  const saveForm = async (vals: Record<string, unknown>) => {
    try {
      setMessage('');
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      const res = await fetch('/api/success-enroll/create', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ program_id: program.id, form_data: vals }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.id) throw new Error(json?.error || 'Failed to save');
      setSavedId(Number(json.id));
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save');
    }
  };

  if (!authed || loading) return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 pt-28">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center text-[hsl(var(--muted-foreground))]">Loading…</div>
      </div>
    </div>
  );

  if (savedId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 pt-28">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Form saved</h2>
            <p className="text-[hsl(var(--muted-foreground))]">Your registration data has been saved. Proceed to payment to complete your enrollment, or pay later from your dashboard.</p>
            <div className="flex gap-3 justify-center">
              <a href={`/programs/${program.slug}`} className="btn-outline">Back</a>
              <a href={`/payment?program=${program.id}&se=${savedId}`} className="btn-primary">Proceed to Payment</a>
              <a href="/dashboard" className="btn-outline">Pay later</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 pt-28">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-3">
          <h2 className="text-2xl font-bold">Register for {program.title}</h2>
          {program.description && (<p className="text-[hsl(var(--muted-foreground))]">{program.description}</p>)}
          {schema ? (
            <FormRenderer schema={schema} onSubmit={saveForm} submitLabel="Save" />
          ) : (
            <p className="text-[hsl(var(--muted-foreground))]">Form not available yet. Please contact admin.</p>
          )}
          {message && <p className="text-sm text-red-600">{message}</p>}
        </div>
      </div>
    </div>
  );
}
