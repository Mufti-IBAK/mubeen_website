"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FormRenderer } from "@/components/form-builder/FormRenderer";
import type { FormSchema } from "@/components/form-builder/FormBuilder";

declare const FlutterwaveCheckout: any;

type Plan = { id: number; plan_type: 'individual'|'family'; family_size: number|null; price: number; currency: string; duration_months: number };

enum FlowStep { SELECT_PLAN = 'SELECT_PLAN', FORM_HEAD = 'FORM_HEAD', FORM_MEMBER = 'FORM_MEMBER' }

export const DynamicRegistrationFlow: React.FC<{ programSlug?: string }> = ({ programSlug }) => {
  const [program, setProgram] = useState<{ id: number; title: string; slug: string } | null>(null);
  const [type, setType] = useState<"individual" | "family">("individual");
  const [familySize, setFamilySize] = useState<number>(2);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [memberSchema, setMemberSchema] = useState<FormSchema | null>(null);
  const [remainingMembers, setRemainingMembers] = useState<number>(0);
  const [step, setStep] = useState<FlowStep>(FlowStep.SELECT_PLAN);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Family size options come from admin-defined plans (no hardcoding)
  const familySizeOptions = useMemo(() => {
    const sizes = plans
      .filter(p => p.plan_type === 'family' && typeof p.family_size === 'number')
      .map(p => p.family_size as number);
    return Array.from(new Set(sizes)).sort((a, b) => a - b);
  }, [plans]);

  // Draft & submission state
  const [draftEnrollmentId, setDraftEnrollmentId] = useState<number | null>(null);
  const [headValues, setHeadValues] = useState<Record<string, unknown>>({});
  const [memberValues, setMemberValues] = useState<Record<string, unknown>[]>([]);
  const [locked, setLocked] = useState(false);

  const selectedPlan = useMemo(() => {
    if (!program) return null;
    if (type === 'individual') return plans.find(p => p.plan_type === 'individual' && p.family_size === null) || null;
    return plans.find(p => p.plan_type === 'family' && p.family_size === familySize) || null;
  }, [plans, type, familySize, program]);

  // Progress bars removed per requirements
  const steps = [
    { key: FlowStep.SELECT_PLAN, label: 'Select Plan' },
    { key: FlowStep.FORM_HEAD, label: type === 'family' ? 'Family Head' : 'Details' },
    { key: FlowStep.FORM_MEMBER, label: 'Family Members' },
  ];
  const currentIndex = Math.max(0, steps.findIndex((s) => s.key === step));
  const totalSteps = type === 'family' ? 3 : 2;
  const progressPct = Math.round((currentIndex / (totalSteps - 1)) * 100);

  useEffect(() => {
    const init = async () => {
      console.log('🚀 Initializing DynamicRegistrationFlow for:', programSlug);
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      console.log('User authenticated:', !!user);
      const { data: prog, error: progError } = await supabase.from("programs").select("id, title, slug").eq("slug", programSlug || "").single();
      if (!prog) { 
        console.error('Program not found for slug:', programSlug, progError);
        setProgram(null); 
        setLoading(false); 
        return; 
      }
      console.log('✅ Program found:', prog.title, 'ID:', prog.id);
      setProgram(prog);
      // Load plans
      const { data: planRows, error: plansError } = await supabase.from('program_plans').select('*').eq('program_id', prog.id);
      if (plansError) console.error('Error loading plans:', plansError);
      console.log('💰 Plans loaded:', planRows?.length || 0);
      setPlans((planRows as any[] || []).map((r) => ({ id: r.id, plan_type: r.plan_type, family_size: r.family_size, price: Number(r.price), currency: r.currency, duration_months: r.duration_months })));
      
      // Confirm forms exist; if none, show message and disable flow
      const { data: formsData, count: formsCount, error: formsError } = await supabase
        .from('program_forms')
        .select('id', { count: 'exact' })
        .eq('program_id', prog.id);
      if (formsError) console.error('Error checking forms:', formsError);
      console.log('📋 Forms count:', formsCount);
      
      if (!formsCount || formsCount === 0) {
        console.warn('⚠️ No forms found - setting error message');
        setMessage('Registration form is not yet configured for this program. Please check back later.');
      } else {
        console.log('✅ Forms exist - clearing error messages');
        // Clear any previous error messages if forms exist
        setMessage('');
      }

      // Load existing draft submission if any
      if (user) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('id,status,payment_status,is_family,family_size,plan_id,form_data')
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
            if (enr.is_family) setType('family');
            if (enr.family_size) setFamilySize(enr.family_size);
            const fd = (enr.form_data as any) || {};
            if (fd.head) setHeadValues(fd.head);
            if (Array.isArray(fd.members)) setMemberValues(fd.members);
          }
        }
      }
      setLoading(false);
    };
    init();
  }, [programSlug]);

  // Load appropriate schema when plan changes
  useEffect(() => {
    const loadForms = async () => {
      if (!program) return;
      console.log(`Loading forms for program ${program.id}, type: ${type}`);
      if (type === 'individual') {
        const { data: formRow, error } = await supabase.from('program_forms').select('schema').eq('program_id', program.id).eq('form_type', 'individual').single();
        if (error) console.error('Error loading individual form:', error);
        console.log('Individual form loaded:', !!formRow?.schema);
        setSchema((formRow?.schema as FormSchema) || null);
        setMemberSchema(null);
      } else {
        const { data: head, error: headError } = await supabase.from('program_forms').select('schema').eq('program_id', program.id).eq('form_type', 'family_head').single();
        const { data: mem, error: memError } = await supabase.from('program_forms').select('schema').eq('program_id', program.id).eq('form_type', 'family_member').single();
        if (headError) console.error('Error loading family head form:', headError);
        if (memError) console.error('Error loading family member form:', memError);
        console.log('Family forms loaded - head:', !!head?.schema, 'member:', !!mem?.schema);
        setSchema((head?.schema as FormSchema) || null);
        setMemberSchema((mem?.schema as FormSchema) || null);
      }
    };
    loadForms();
  }, [program, type]);

  // Ensure selected family size is valid for admin-defined plans
  useEffect(() => {
    if (type === 'family') {
      if (!familySizeOptions.includes(familySize)) {
        setFamilySize(familySizeOptions[0] ?? 2);
      }
    }
  }, [type, familySizeOptions]);

  const startFlow = () => {
    if (type === 'family') setRemainingMembers(Math.max(0, familySize - 1));
    setStep(type === 'individual' ? FlowStep.FORM_HEAD : FlowStep.FORM_HEAD);
  };

  const saveDraft = async (current: Record<string, unknown>) => {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user || !program) return;
    const fd: any = { head: headValues, members: memberValues };
    // Merge current into head or members depending on step
    if (step === FlowStep.FORM_HEAD) fd.head = { ...headValues, ...current };
    if (step === FlowStep.FORM_MEMBER) fd.members = [...memberValues, current];

    if (!draftEnrollmentId) {
      const { data, error } = await supabase.from('enrollments').insert({
        user_id: user.id,
        program_id: program.id,
        is_family: type === 'family',
        family_size: type === 'family' ? familySize : null,
        status: 'draft',
        payment_status: 'unpaid',
        form_data: fd,
      }).select('id').single();
      if (!error && data) setDraftEnrollmentId(data.id);
    } else {
      await supabase.from('enrollments').update({
        is_family: type === 'family',
        family_size: type === 'family' ? familySize : null,
        status: 'draft',
        payment_status: 'unpaid',
        form_data: fd,
      }).eq('id', draftEnrollmentId);
    }
    setMessage('Draft saved. You can continue later from your dashboard.');
  };

  const submitForm = async (vals: Record<string, unknown>) => {
    setMessage("");
    // Persist in memory
    setHeadValues({ ...headValues, ...vals });
    // Optionally persist submissions to enrollments.form_data as draft
    await saveDraft(vals);
    if (type === 'family' && remainingMembers > 0) {
      setRemainingMembers(remainingMembers - 1);
      setStep(FlowStep.FORM_MEMBER);
      return;
    }
    // If no remaining members, proceed to payment
    await createEnrollmentAndPay();
  };

  const submitMemberForm = async (vals: Record<string, unknown>) => {
    setMessage("");
    setMemberValues(prev => [...prev, vals]);
    await saveDraft(vals);
    if (remainingMembers - 1 > 0) {
      setRemainingMembers(remainingMembers - 1);
      setStep(FlowStep.FORM_MEMBER);
      return;
    }
    await createEnrollmentAndPay();
  };

  const createEnrollmentAndPay = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { setMessage('Please log in to continue.'); return; }
    if (!program) { setMessage('Program not found.'); return; }
    if (!selectedPlan) { setMessage('Plan not available.'); return; }

    const payload: any = {
      user_id: user.id,
      program_id: program.id,
      is_family: type === 'family',
      family_size: type === 'family' ? familySize : null,
      status: 'submitted', // lock user editing after submission
      payment_status: 'unpaid',
      plan_id: selectedPlan.id,
      duration_months: selectedPlan.duration_months,
      form_data: { head: headValues, members: memberValues },
    };

    let createdId = draftEnrollmentId;
    if (!draftEnrollmentId) {
      const { data, error } = await supabase.from('enrollments').insert(payload).select('id').single();
      if (error || !data) { setMessage(error?.message || 'Failed to create enrollment'); return; }
      createdId = data.id;
      setDraftEnrollmentId(createdId);
    } else {
      const { error } = await supabase.from('enrollments').update(payload).eq('id', draftEnrollmentId);
      if (error) { setMessage(error.message); return; }
    }

    try {
      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
        tx_ref: String(createdId),
        amount: selectedPlan.price,
        currency: selectedPlan.currency || 'NGN',
        redirect_url: `/payment-success?ref=${createdId}`,
        customer: { email: user.email, name: user.email?.split('@')[0] || 'Student' },
        customizations: { title: 'Mubeen Academy', description: `Payment for ${program.title}`, logo: '/logo.png' },
        onclose: () => {}
      });
      setMessage('Redirecting to payment...');
    } catch (e) {
      setMessage('Unable to initiate payment.');
    }
  };

  if (loading) return <div className="text-center text-[hsl(var(--muted-foreground))]">Loading...</div>;
  if (!program) return (
    <div className="text-center space-y-4">
      <div className="text-[hsl(var(--muted-foreground))]">Program not found.</div>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">The program "{programSlug}" does not exist or has been removed.</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step progress */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3 text-xs text-[hsl(var(--muted-foreground))]">
            {steps.slice(0, totalSteps).map((s, idx) => (
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
          <div className="card-header">
            <h3 className="card-title">Select Plan</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="flex items-center gap-3">
              <button className={type === 'individual' ? 'btn-primary' : 'btn-outline'} onClick={() => setType('individual')}>Individual</button>
              <button className={type === 'family' ? 'btn-primary' : 'btn-outline'} onClick={() => setType('family')}>Family</button>
              {type === 'family' && (
                <select value={familySize} onChange={(e) => setFamilySize(Number(e.target.value))} className="select w-40">
                  {familySizeOptions.length > 0 ? (
                    familySizeOptions.map(n => <option key={n} value={n}>Family of {n}</option>)
                  ) : (
                    [2,3,4,5].map(n => <option key={n} value={n}>Family of {n}</option>)
                  )}
                </select>
              )}
            </div>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              {selectedPlan ? (
                <>
                  <p>Price: <span className="font-semibold text-[hsl(var(--foreground))]">{selectedPlan.currency} {selectedPlan.price}</span> • Duration: {selectedPlan.duration_months} months</p>
                  {!schema || (type === 'family' && !memberSchema) ? (
                    <p className="mt-1 text-amber-600">Registration form not configured yet for this {type === 'family' ? 'family' : 'individual'} plan. Please check back later.</p>
                  ) : null}
                </>
              ) : (
                <p>No plan available for this selection.</p>
              )}
            </div>
            <div className="pt-2">
              <button disabled={!selectedPlan || !schema || (type === 'family' && !memberSchema) || message.includes('not yet configured')} onClick={startFlow} className="btn-primary">Continue</button>
            </div>
          </div>
        </div>
      )}

      {step === FlowStep.FORM_HEAD && schema && (
        <div className="card">
          <div className="card-body">
            {locked ? (
              <p className="text-[hsl(var(--muted-foreground))]">Your submission is locked. Please contact support for changes.</p>
            ) : (
              <FormRenderer schema={schema} onSubmit={submitForm} onSaveDraft={saveDraft} initialValues={headValues} />
            )}
          </div>
        </div>
      )}

      {step === FlowStep.FORM_MEMBER && memberSchema && (
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">Family members remaining: {remainingMembers}</p>
            {locked ? (
              <p className="text-[hsl(var(--muted-foreground))]">Your submission is locked.</p>
            ) : (
              <FormRenderer schema={memberSchema} onSubmit={submitMemberForm} onSaveDraft={saveDraft} />
            )}
          </div>
        </div>
      )}

      {message && <p className="text-sm text-[hsl(var(--muted-foreground))] mt-3 text-center">{message}</p>}
    </div>
  );
};

