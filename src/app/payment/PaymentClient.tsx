'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';


type Program = { id: number; title: string };

type Plan = { program_id: number; id: number; plan_type: 'individual'|'family'; family_size: number|null; price: number; currency: string };

type PlanChoice = { value: string; label: string; planId: number };

type PaymentKind = 'program' | 'donation' | 'other';

type FormState = {
  full_name: string;
  email: string;
  selection: string; // program:<id> | donation | other
  kind: PaymentKind;
  program_id?: number | null;
  plan_choice?: string; // individual | family:<n>
  amount: string;
  currency: string;
  description?: string;
};

type PendingSe = {
  id: number;
  program_id: number | null;
  program_title: string | null;
  status: string | null;
  type: string | null;
  created_at: string;
};

export default function PaymentClient() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pendingSe, setPendingSe] = useState<PendingSe[]>([]);
  const [selectedSeId, setSelectedSeId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ full_name: '', email: '', selection: '', kind: 'program', program_id: undefined, amount: '', currency: 'NGN', description: '' });
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
        const se = params.get('se');
        if (se) {
          // Securely fetch success_enroll and lock fields
          const res = await fetch(`/api/success-enroll/by-id?id=${encodeURIComponent(se)}`, { cache: 'no-store' });
          const seRow = res.ok ? await res.json().catch(() => null) : null;
          if (seRow && seRow.program_id) {
            const seId = Number(se);
            setLockedSe(seId);
            setSelectedSeId(seId);

            // Derive amount from individual plan and participant_count with discount
            let amount = seRow.amount as number | null;
            let currency = seRow.currency as string | null;
            const participants = Number(seRow.participant_count || 1);
            setLockedParticipants(participants);
            if (!amount || Number(amount) === 0) {
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
            }

            setForm((f) => ({
              ...f,
              selection: `program:${seRow.program_id}`,
              program_id: seRow.program_id,
              amount: amount ? String(amount) : f.amount,
              currency: currency || f.currency,
              full_name: seRow.user_name || f.full_name,
              email: seRow.user_email || f.email,
            }));
          }
        }
        setForm((f) => ({
          ...f,
          full_name: (profileRow as any)?.full_name || user.user_metadata?.full_name || '',
          email: (profileRow as any)?.email || user.email || '',
          ...(preProgram ? { selection: `program:${preProgram}`, program_id: Number(preProgram) } : {}),
        }));

        // Load pending success_enroll rows for this user (unpaid program registrations)
        const { data: seRows } = await supabase
          .from('success_enroll')
          .select('id, program_id, program_title, created_at, status, type')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        const pending = (seRows as PendingSe[] | null) ?? [];
        setPendingSe(pending);

        const pendingProgramIds = Array.from(
          new Set(
            pending
              .filter((row) => row.program_id && (row.type === 'program' || !row.type))
              .map((row) => row.program_id as number),
          ),
        );

        if (pendingProgramIds.length === 0) {
          setPrograms([]);
          setPlans([]);
        } else {
          const [{ data: programRows }, { data: planRows }] = await Promise.all([
            supabase.from('programs').select('id,title').in('id', pendingProgramIds).order('title', { ascending: true }),
            supabase.from('program_plans').select('id, program_id, plan_type, family_size, price, currency').in('program_id', pendingProgramIds),
          ]);
          setPrograms((programRows as Program[]) || []);
          setPlans(((planRows as any[]) || []).map((r) => ({ id: r.id, program_id: r.program_id, plan_type: r.plan_type, family_size: r.family_size, price: Number(r.price || 0), currency: r.currency || 'NGN' })));
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const programOptions = useMemo(() => programs.map((p) => ({ label: p.title, value: `program:${p.id}` })), [programs]);

  // Determine selected plan default (use individual plan where family_size is null)
  const availableChoices: PlanChoice[] = useMemo(() => {
    if (form.kind !== 'program' || !form.program_id) return [];
    const candidates = plans.filter((pl) => pl.program_id === form.program_id);
    const choices: PlanChoice[] = [];
    const indiv = candidates.find((pl) => pl.plan_type === 'individual' && (pl.family_size === null || typeof pl.family_size === 'undefined'));
    if (indiv) choices.push({ value: 'individual', label: 'Individual', planId: indiv.id });
    // No explicit family plan selection in UI anymore; pricing for group is derived by count & 5% discount
    return choices;
  }, [plans, form.kind, form.program_id]);

  const selectedPlan = useMemo(() => {
    if (form.kind !== 'program' || !form.program_id) return null;
    const candidates = plans.filter((pl) => pl.program_id === form.program_id);
    if (!availableChoices.length) return null;
    const choice = form.plan_choice || availableChoices[0]?.value;
    if (choice === 'individual') {
      return candidates.find((pl) => pl.plan_type === 'individual' && (pl.family_size === null || typeof pl.family_size === 'undefined')) || null;
    }
    if (choice.startsWith('family:')) {
      const n = Number(choice.split(':')[1]);
      return candidates.find((pl) => pl.plan_type === 'family' && pl.family_size === n) || null;
    }
    return null;
  }, [availableChoices, plans, form.kind, form.program_id, form.plan_choice]);

  // Sync amount on program selection
  useEffect(() => {
    if (lockedSe) return; // when locked by SE, do not override computed amount
    if (form.kind === 'program' && selectedPlan) {
      // If group, apply 5% discount; in unlocked flow we don't know participants from SE, default 1
      const participants = 1;
      const base = selectedPlan.price;
      const total = participants > 1 ? Math.round(base * participants * 0.95) : base;
      setForm((f) => ({ ...f, amount: String(total), currency: selectedPlan.currency }));
    }
  }, [form.kind, selectedPlan, lockedSe]);

  const onSelectionChange = (value: string) => {
    if (value === 'donation') {
      setSelectedSeId(null);
      setForm((f) => ({ ...f, selection: value, kind: 'donation', program_id: null, amount: '', description: '' }));
    } else if (value === 'other') {
      setSelectedSeId(null);
      setForm((f) => ({ ...f, selection: value, kind: 'other', program_id: null, amount: '', description: '' }));
    } else if (value.startsWith('program:')) {
      const pid = Number(value.split(':')[1]);
      const match = pendingSe.find((row) => row.program_id === pid && (row.type === 'program' || !row.type));
      setSelectedSeId(match ? match.id : null);
      setForm((f) => ({ ...f, selection: value, kind: 'program', program_id: pid }));
    } else {
      setForm((f) => ({ ...f, selection: value }));
    }
  };

  const canSubmit = useMemo(() => {
    if (!form.full_name || !form.email) return false;
    if (form.kind === 'program') return !!form.program_id && !!form.amount;
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
                <input id="amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input w-full" placeholder="0.00" disabled={form.kind === 'program' || !!lockedSe} />
                <input id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input w-28" disabled={!!lockedSe} />
              </div>
              {form.kind === 'program' && (selectedPlan || lockedSe) && (
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