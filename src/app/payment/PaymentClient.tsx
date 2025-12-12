'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';


type Program = { id: number; title: string };
type Skill = { id: number; title: string };

type Plan = { program_id?: number | null; skill_id?: number | null; id: number; plan_type: 'individual'|'family'; family_size: number|null; price: number; currency: string };

type PlanChoice = { value: string; label: string; planId: number };

type PaymentKind = 'program' | 'skill' | 'donation' | 'other';

type FormState = {
  full_name: string;
  email: string;
  selection: string; // program:<id> | skill:<id> | donation | other
  kind: PaymentKind;
  program_id?: number | null;
  skill_id?: number | null;
  plan_choice?: string; // individual | family:<n>
  amount: string;
  currency: string;
  description?: string;
};

type PendingSe = {
  id: number;
  program_id: number | null;
  skill_id?: number | null;
  program_title: string | null; // or Title
  status: string | null;
  type: string | null;
  created_at: string;
};

export default function PaymentClient() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pendingSe, setPendingSe] = useState<PendingSe[]>([]);
  const [selectedSeId, setSelectedSeId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ full_name: '', email: '', selection: '', kind: 'program', program_id: undefined, skill_id: undefined, amount: '', currency: 'NGN', description: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [lockedSe, setLockedSe] = useState<number | null>(null);
  const [lockedCategory, setLockedCategory] = useState<string | null>(null);
  const [lockedParticipants, setLockedParticipants] = useState<number>(1);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes.user;
        if (!user) {
          window.location.href = `/login?next=${encodeURIComponent('/payment')}`;
          return;
        }
        const { data: profileRow } = await supabase.from('profiles').select('full_name,email').eq('id', user.id).maybeSingle();
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
        const preProgram = params.get('program') || params.get('program_id');
        const preSkill = params.get('skill') || params.get('skill_id');
        const se = params.get('se');

        if (se) {
          // Securely fetch success_enroll and lock fields
          const res = await fetch(`/api/success-enroll/by-id?id=${encodeURIComponent(se)}`, { cache: 'no-store' });
          const seRow = res.ok ? await res.json().catch(() => null) : null;
          if (seRow) {
            const seId = Number(se);
            setLockedSe(seId);
            setSelectedSeId(seId);

            // Derive amount from individual plan and participant_count with discount
            let amount = seRow.amount as number | null;
            let currency = seRow.currency as string | null;
            const participants = Number(seRow.participant_count || 1);
            setLockedParticipants(participants);
            
            // Logic for auto-calculating price if missing
            if (!amount || Number(amount) === 0) {
              if (seRow.program_id) {
                const { data: plan } = await supabase
                  .from('program_plans')
                  .select('price,currency')
                  .eq('program_id', seRow.program_id)
                  .eq('plan_type', 'individual')
                  .is('family_size', null)
                  .maybeSingle();
                if (plan) {
                  const base = Number((plan as any).price || 0);
                  const total = participants > 1 ? Math.round(base * participants * 0.95) : base;
                  amount = total;
                  currency = (plan as any).currency || 'NGN';
                }
              } else if (seRow.skill_id) {
                const { data: plan } = await supabase
                  .from('skill_plans')
                  .select('price,currency')
                  .eq('skill_id', seRow.skill_id)
                  .maybeSingle(); // Assuming skills have simple pricing rows usually
                if (plan) {
                   const base = Number((plan as any).price || 0);
                   amount = base;
                   currency = (plan as any).currency || 'NGN';
                }
              }
            }

            setForm((f) => ({
              ...f,
              selection: seRow.program_id ? `program:${seRow.program_id}` : (seRow.skill_id ? `skill:${seRow.skill_id}` : ''),
              kind: seRow.program_id ? 'program' : (seRow.skill_id ? 'skill' : f.kind),
              program_id: seRow.program_id,
              skill_id: seRow.skill_id,
              amount: amount ? String(amount) : f.amount,
              currency: currency || f.currency,
              full_name: seRow.user_name || f.full_name,
              email: seRow.user_email || f.email,
            }));
          }
        }
        
        setForm((f) => ({
          ...f,
          full_name: (profileRow as any)?.full_name || user.user_metadata?.full_name || f.full_name,
          email: (profileRow as any)?.email || user.email || f.email,
          ...(preProgram ? { selection: `program:${preProgram}`, kind: 'program', program_id: Number(preProgram) } : {}),
          ...(preSkill ? { selection: `skill:${preSkill}`, kind: 'skill', skill_id: Number(preSkill) } : {}),
        }));

        // Load pending success_enroll rows for this user (unpaid registrations)
        const { data: seRows } = await supabase
          .from('success_enroll')
          .select('id, program_id, skill_id, program_title, created_at, status, type')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        const pending = (seRows as PendingSe[] | null) ?? [];
        setPendingSe(pending);

        // Fetch Programs
        const pendingProgramIds = Array.from(new Set(pending.filter(r => r.program_id).map(r => r.program_id!)));
        const pendingSkillIds = Array.from(new Set(pending.filter(r => r.skill_id).map(r => r.skill_id!)));
        // Also fetch all programs/skills possibly if they want to pay unrelated to enroll (optional check)
        // But for "make a payment" we usually want dropdown of available options. 
        // Current code fetches ONLY pending items. We should probably fetch all or keep logic?
        // Original logic: fetched pending programs.
        // Let's stick to logic: If you have pending enrollments, we load those program/skill details.
        // Or if simple payment, we might want all.
        // But the dropdown is populated from 'programs' state. 
        // Let's assume we want to load ALL available programs/skills so users can just pay.
        // BUT logic at lines 129-139 suggests it filters by pending. This restricts users to paying ONLY for what they enrolled in?
        // Actually, lines 121-127 filter pending.
        // If I want to allow paying for *any* program, the original code was restrictive.
        // I will keep it restrictive to pending actions + any ID passed in params to avoid loading huge lists unneeded.
        
        // Let's enhance to load ALL active programs and skills for dropdown, OR just pending.
        // "Please select the exact program entry you registered for" implies pending.
        
        const allProgramIds = new Set([...pendingProgramIds, Number(preProgram)].filter(n => n));
        const allSkillIds = new Set([...pendingSkillIds, Number(preSkill)].filter(n => n));

        const promises: Promise<any>[] = [];
        if (allProgramIds.size > 0) {
            promises.push(supabase.from('programs').select('id,title').in('id', Array.from(allProgramIds)));
            promises.push(supabase.from('program_plans').select('id, program_id, plan_type, family_size, price, currency').in('program_id', Array.from(allProgramIds)));
        } else {
             // Maybe fetch all active programs anyway for the dropdown? 
             // The original code only fetched pending. If user navigated to /payment directly, they see empty?
             // Ah, lines 129: setPrograms([]). So originally if no pending, list is empty.
             // I will maintain this behavior but extend for skills.
             promises.push(Promise.resolve({data: []})); // Placeholder
             promises.push(Promise.resolve({data: []}));
        }

        if (allSkillIds.size > 0) {
             promises.push(supabase.from('skills').select('id,title').in('id', Array.from(allSkillIds)));
             promises.push(supabase.from('skill_plans').select('id, skill_id, price, currency').in('skill_id', Array.from(allSkillIds)));
        } else {
             promises.push(Promise.resolve({data: []}));
             promises.push(Promise.resolve({data: []}));
        }

        const [progRes, progPlansRes, skillRes, skillPlansRes] = await Promise.all(promises);

        setPrograms((progRes.data as Program[]) || []);
        setSkills((skillRes.data as Skill[]) || []);
        
        const combinedPlans: Plan[] = [
            ...((progPlansRes.data || []) as any[]).map((r) => ({ ...r, price: Number(r.price), currency: r.currency || 'NGN' })),
            ...((skillPlansRes.data || []) as any[]).map((r) => ({ ...r, price: Number(r.price), currency: r.currency || 'NGN', plan_type: 'individual' })), // Skills usually simple
        ];
        setPlans(combinedPlans);

      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const programOptions = useMemo(() => programs.map((p) => ({ label: p.title, value: `program:${p.id}` })), [programs]);
  const skillOptions = useMemo(() => skills.map((s) => ({ label: s.title, value: `skill:${s.id}` })), [skills]);

  // Determine selected plan default
  const availableChoices: PlanChoice[] = useMemo(() => {
    if (form.kind === 'program' && form.program_id) {
      const candidates = plans.filter((pl) => pl.program_id === form.program_id);
      const choices: PlanChoice[] = [];
      const indiv = candidates.find((pl) => pl.plan_type === 'individual' && !pl.family_size);
      if (indiv) choices.push({ value: 'individual', label: 'Individual', planId: indiv.id });
      return choices;
    }
    if (form.kind === 'skill' && form.skill_id) {
       // Skills match just by skill_id
       return []; // Skill pricing is usually single-tier, handled by auto-selection or just amount lookup
    }
    return [];
  }, [plans, form.kind, form.program_id, form.skill_id]);

  const selectedPlan = useMemo(() => {
    if (form.kind === 'program' && form.program_id) {
       const candidates = plans.filter((pl) => pl.program_id === form.program_id);
       const choice = form.plan_choice || 'individual'; 
       // Simplified logic
       if (choice === 'individual') return candidates.find(p => p.plan_type === 'individual' && !p.family_size) || null;
    }
    if (form.kind === 'skill' && form.skill_id) {
        return plans.find(p => p.skill_id === form.skill_id) || null;
    }
    return null;
  }, [plans, form.kind, form.program_id, form.skill_id, form.plan_choice]);

  // Sync amount
  useEffect(() => {
    if (lockedSe) return; 
    if (selectedPlan) {
      if (form.kind === 'program') {
         // Default logic for programs
         setForm((f) => ({ ...f, amount: String(selectedPlan.price), currency: selectedPlan.currency }));
      } else if (form.kind === 'skill') {
         setForm((f) => ({ ...f, amount: String(selectedPlan.price), currency: selectedPlan.currency }));
      }
    }
  }, [form.kind, selectedPlan, lockedSe]);

  const onSelectionChange = (value: string) => {
    if (value === 'donation') {
      setSelectedSeId(null);
      setForm((f) => ({ ...f, selection: value, kind: 'donation', program_id: null, skill_id: null, amount: '', description: '' }));
    } else if (value === 'other') {
      setSelectedSeId(null);
      setForm((f) => ({ ...f, selection: value, kind: 'other', program_id: null, skill_id: null, amount: '', description: '' }));
    } else if (value.startsWith('program:')) {
      const pid = Number(value.split(':')[1]);
      const match = pendingSe.find((row) => row.program_id === pid && (row.type === 'program' || !row.type));
      setSelectedSeId(match ? match.id : null);
      setForm((f) => ({ ...f, selection: value, kind: 'program', program_id: pid, skill_id: null }));
    } else if (value.startsWith('skill:')) {
      const sid = Number(value.split(':')[1]);
      const match = pendingSe.find((row) => row.skill_id === sid && row.type === 'skill');
      setSelectedSeId(match ? match.id : null);
      setForm((f) => ({ ...f, selection: value, kind: 'skill', skill_id: sid, program_id: null }));
    } else {
      setForm((f) => ({ ...f, selection: value }));
    }
  };

  const canSubmit = useMemo(() => {
    if (!form.full_name || !form.email) return false;
    if (form.kind === 'program') return !!form.program_id && !!form.amount;
    if (form.kind === 'skill') return !!form.skill_id && !!form.amount;
    if (form.kind === 'donation') return !!form.amount;
    if (form.kind === 'other') return !!form.amount && !!form.description?.trim();
    return false;
  }, [form]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      const cur = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      const seFromUrl = cur.get('se');
      const effectiveSe = selectedSeId ? String(selectedSeId) : seFromUrl;
      // Secure summary: POST to tokenizing endpoint which redirects to summary
      const formData = new FormData();
      formData.set('full_name', form.full_name);
      formData.set('email', form.email);
      formData.set('kind', form.kind);
      formData.set('amount', form.amount);
      formData.set('currency', form.currency);
      if (form.program_id) formData.set('program_id', String(form.program_id));
      if (form.skill_id) formData.set('skill_id', String(form.skill_id));
      if (form.kind === 'other' && form.description) formData.set('description', form.description);
      if (effectiveSe) formData.set('se', effectiveSe);
      const res = await fetch('/api/payment/summary/create', { method: 'POST', body: formData });
      if (res.redirected) {
        window.location.href = res.url;
      } else {
        const j = await res.json().catch(() => ({}));
        setMessage(j?.error || 'Failed to prepare summary');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-6 py-24">
      <div className="container-page max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold">Make a Payment</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Please select the exact program entry you registered for; the amount will be set automatically.</p>
        </div>

        {loading ? (
          <div className="card"><div className="card-body">Loading…</div></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Instruction</p>
              <p className="text-[hsl(var(--foreground))]">Ensure the fields below match the program you registered for. These are locked for your security.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium">Full name</label>
                <input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input w-full" disabled />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium">Email</label>
                <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input w-full" disabled />
              </div>
            </div>
            <div>
              <label htmlFor="payment_for" className="block text-sm font-medium">What are you paying for?</label>
              <select id="payment_for" value={form.selection} onChange={(e) => onSelectionChange(e.target.value)} className="input w-full" disabled={!!lockedSe}>
                <option value="" disabled>Select an option</option>
                <optgroup label="Programs">
                  {programOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Skills">
                  {skillOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
                <option value="donation">Donations</option>
                <option value="other">Others</option>
              </select>
            </div>
            {form.kind === 'other' && (
              <div>
                <label htmlFor="description" className="block text-sm font-medium">Description</label>
                <input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input w-full" placeholder="Describe what this payment is for" />
              </div>
            )}
            {/* Category selection removed in unified model */}

            <div>
              <label htmlFor="amount" className="block text-sm font-medium">Amount</label>
              <div className="flex gap-2">
                <input id="amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input w-full" placeholder="0.00" disabled={form.kind === 'program' || form.kind === 'skill' || !!lockedSe} />
                <input id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input w-28" disabled={!!lockedSe} />
              </div>
              {(form.kind === 'program' || form.kind === 'skill') && (selectedPlan || lockedSe) && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Automatically set from registration.</p>
              )}
            </div>
            {lockedCategory && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Category: {lockedCategory}</p>
            )}

            {message && <p className="text-red-600 text-sm">{message}</p>}

            <button type="submit" disabled={!canSubmit || submitting} className="btn-primary w-full">
              {submitting ? 'Please wait…' : 'Complete Payment'}
            </button>

            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Need help? <a className="text-[hsl(var(--primary))] font-medium" href="mailto:mubeenacademy001@gmail.com">Contact support</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}