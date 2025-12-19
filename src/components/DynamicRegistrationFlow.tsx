"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FormRenderer } from "@/components/form-builder/FormRenderer";
import type { FormSchema } from "@/components/form-builder/FormBuilder";
import { useRouter } from "next/navigation";

enum FlowStep { SELECT_PLAN = 'SELECT_PLAN', FORM_HEAD = 'FORM_HEAD' }

export const DynamicRegistrationFlow: React.FC<{ programSlug?: string }> = ({ programSlug }) => {
  const [program, setProgram] = useState<{ id: number; title: string; slug: string } | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [step, setStep] = useState<FlowStep>(FlowStep.SELECT_PLAN);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const router = useRouter();

  // Draft & submission state
  const [draftEnrollmentId, setDraftEnrollmentId] = useState<number | null>(null);
  const [headValues, setHeadValues] = useState<Record<string, unknown>>({});
  const [locked, setLocked] = useState(false);

  const steps = [{ key: FlowStep.FORM_HEAD, label: 'Details' }];
  const currentIndex = step === FlowStep.SELECT_PLAN ? -1 : 0;
  const totalSteps = 1;
  const progressPct = step === FlowStep.SELECT_PLAN ? 0 : 100;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      const { data: prog, error: progError } = await supabase.from("programs").select("id, title, slug").eq("slug", programSlug || "").single();
      if (!prog) { 
        setProgram(null); 
        setLoading(false); 
        return; 
      }
      setProgram(prog);
      
      // Confirm forms exist; if none, show message and disable flow
      const { data: formsData, count: formsCount, error: formsError } = await supabase
        .from('program_forms')
        .select('id', { count: 'exact' })
        .eq('program_id', prog.id);
      
      if (!formsCount || formsCount === 0) {
        setMessage('Registration form is not yet configured for this program. Please check back later.');
      } else {
        setMessage('');
      }

      // Load existing draft submission if any
      if (user) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('id,status,payment_status,form_data')
          .eq('user_id', user.id)
          .eq('program_id', prog.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (enr) {
          if (enr.status === 'submitted' || (enr.payment_status && enr.payment_status !== 'unpaid')) {
            setLocked(true);
          } else {
            setDraftEnrollmentId(enr.id);
            const fd = (enr.form_data as any) || {};
            if (fd.head) setHeadValues(fd.head);
          }
        }
      }
      setLoading(false);
    };
    init();
  }, [programSlug]);

  // Load individual schema
  useEffect(() => {
    const loadForms = async () => {
      if (!program) return;
      const { data: formRow, error } = await supabase.from('program_forms').select('schema').eq('program_id', program.id).eq('form_type', 'individual').single();
      setSchema((formRow?.schema as FormSchema) || null);
    };
    loadForms();
  }, [program]);

  const startFlow = () => {
    setStep(FlowStep.FORM_HEAD);
  };

  const saveDraft = async (current: Record<string, unknown>) => {
    if (!program) return;
    const fd = { head: { ...headValues, ...current } };

    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      // We'll use the same API but tell it it's individual
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          program_id: program.id,
          registration_type: 'individual',
          form_data: fd,
        }),
      });
      if (res.ok) {
        const { draft } = await res.json();
        if (draft?.id) setDraftEnrollmentId(draft.id);
        setMessage('Draft saved. You can continue later from your dashboard.');
      } else {
        setMessage('Failed to save draft.');
      }
    } catch {
      setMessage('Failed to save draft.');
    }
  };

  const submitForm = async (vals: Record<string, unknown>) => {
    setMessage("");
    setHeadValues({ ...headValues, ...vals });
    await proceedToPayment(vals);
  };

  const proceedToPayment = async (finalValues?: Record<string, unknown>) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { setMessage('Please log in to continue.'); return; }
    if (!program) { setMessage('Program not found.'); return; }

    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      const fd = { head: { ...headValues, ...(finalValues || {}) } };
      
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          program_id: program.id,
          registration_type: 'individual',
          form_data: fd,
        }),
      });
      
      if (!res.ok) {
        setMessage('Failed to save your progress. Please try again.');
        return;
      }
      
      const { draft } = await res.json();
      const draftId = draft?.id;
      if (!draftId) {
        setMessage('Unable to create draft.');
        return;
      }
      
      // Navigate to payment guide
      router.push(`/register/payment-guide?draft=${draftId}`);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save draft.');
    }
  };

  if (loading) return <div className="text-center text-[hsl(var(--muted-foreground))]">Loading...</div>;
  if (!program) return (
    <div className="text-center space-y-4">
      <div className="text-[hsl(var(--muted-foreground))]">Program not found.</div>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">The program &quot;{programSlug}&quot; does not exist or has been removed.</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step progress */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3 text-xs text-[hsl(var(--muted-foreground))]">
            {steps.map((s, idx) => (
              <div key={s.label} className="flex-1 flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${idx <= currentIndex ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                  {idx + 1}
                </div>
                <span className={idx <= currentIndex ? 'text-[hsl(var(--foreground))]' : ''}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="h-2 w-full bg-[hsl(var(--muted))] rounded-full overflow-hidden">
            <div className="h-full bg-[hsl(var(--primary))] transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>
      
      {step === FlowStep.SELECT_PLAN && (
        <div className="card">
          <div className="card-body text-center py-8">
            <h3 className="text-xl font-bold mb-2">Ready to Start?</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">Click below to begin your registration for {program.title}.</p>
            <button 
              disabled={!schema || !!message} 
              onClick={startFlow} 
              className="btn-primary w-full max-w-xs mx-auto"
            >
              Start Registration
            </button>
          </div>
        </div>
      )}

      {step === FlowStep.FORM_HEAD && schema && (
        <div className="card">
          <div className="card-body">
            {locked ? (
              <p className="text-[hsl(var(--muted-foreground))]">Your submission is locked. Please contact support for any changes.</p>
            ) : (
              <FormRenderer 
                schema={schema} 
                onSubmit={submitForm} 
                onSaveDraft={saveDraft} 
                initialValues={headValues} 
              />
            )}
          </div>
        </div>
      )}

      {message && <p className="text-sm text-[hsl(var(--muted-foreground))] mt-3 text-center">{message}</p>}
    </div>
  );
};
