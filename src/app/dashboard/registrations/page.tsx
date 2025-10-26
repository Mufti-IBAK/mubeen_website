"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

declare const FlutterwaveCheckout: any;

type Enrollment = {
  id: number;
  program_id: number;
  status: string | null;
  payment_status: string | null;
  created_at: string;
  duration_months: number | null;
  plan_id: number | null;
  amount: number | null;
  currency: string | null;
  classroom_link?: string | null;
  defer_active?: boolean | null;
  completed_at?: string | null;
};

type Program = { id: number; title: string; slug: string };

type Plan = { id: number; price: number; currency: string };

export default function DashboardRegistrationsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programs, setPrograms] = useState<Record<number, Program>>({});
  const [plans, setPlans] = useState<Record<number, Plan>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all'|'draft'|'submitted'|'registered'|'updated'>('all');
  const [filterPayment, setFilterPayment] = useState<'all'|'unpaid'|'paid'|'refunded'>('all');
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  // Modal state
  const [modal, setModal] = useState<{ type: 'transfer'|'defer'|'quit'|null; enrollment?: Enrollment|null }>({ type: null, enrollment: null });
  const [reason, setReason] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [targetProgram, setTargetProgram] = useState<number | ''>('');
  const [copied, setCopied] = useState(false);
  const closeModal = () => { setModal({ type: null, enrollment: null }); setReason(''); setTargetProgram(''); setCopied(false); };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user?.email) setContactEmail(user.email);
      if (!user) { setLoading(false); return; }
      const { data: enr } = await supabase
        .from('enrollments')
        .select('id, program_id, status, payment_status, created_at, duration_months, plan_id, amount, currency, classroom_link, defer_active, completed_at, is_draft')
        .eq('user_id', user.id)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });
      const list = (enr as Enrollment[]) || [];
      setEnrollments(list);
      const pids = Array.from(new Set(list.map(e => e.program_id)));
      if (pids.length) {
        const { data: progs } = await supabase.from('programs').select('id,title,slug,image_url,duration,start_date,language,level,overview,schedule,instructors').in('id', pids);
        const pm: Record<number, Program> = {};
        (progs as any[] | null)?.forEach(p => { pm[p.id] = p as any; });
        setPrograms(pm);
      }
      const planIds = Array.from(new Set(list.map(e => e.plan_id).filter(Boolean))) as number[];
      if (planIds.length) {
        const { data: planRows } = await supabase.from('program_plans').select('id, price, currency').in('id', planIds);
        const pl: Record<number, Plan> = {};
        (planRows as any[] | null)?.forEach(r => { pl[r.id] = { id: r.id, price: Number(r.price), currency: r.currency || 'NGN' }; });
        setPlans(pl);
      }
      // Load all programs for transfer modal options
      const { data: allProgs } = await supabase.from('programs').select('id,title,slug').order('title');
      setAllPrograms((allProgs as Program[] | null) || []);
      setLoading(false);
    };
    init();
  }, []);

  const filtered = useMemo(() => {
    return enrollments.filter(e => {
      if (filterStatus !== 'all' && (e.status || 'draft') !== filterStatus) return false;
      if (filterPayment !== 'all' && (e.payment_status || 'unpaid') !== filterPayment) return false;
      return true;
    });
  }, [enrollments, filterStatus, filterPayment]);

  // Progress bar removed from the UI and logic

  const payNow = async (e: Enrollment) => {
    const p = programs[e.program_id];
    const plan = (e.plan_id && plans[e.plan_id]) || null;
    const price = e.amount ?? (plan?.price ?? 0);
    const currency = e.currency || plan?.currency || 'NGN';
    if (!price) return alert('No price available for this enrollment.');

    // Get current user email for customer info
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user?.email) return alert('Please log in to continue with payment.');

    try {
      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
        tx_ref: String(e.id),
        amount: price,
        currency,
        redirect_url: `/payment-success?ref=${e.id}`,
        customer: { 
          email: user.email, 
          name: user.email.split('@')[0] || 'Student' 
        },
        customizations: { title: 'Mubeen Academy', description: `Payment for ${p?.title || 'Program'}`, logo: '/logo.png' },
      });
    } catch {
      alert('Unable to initiate payment');
    }
  };

  // Build a professional email subject and body for manual sending
  const email = useMemo(() => {
    const e = modal.enrollment;
    if (!e || !modal.type) return { subject: '', body: '' };
    const prog = programs[e.program_id];
    let subject = '';
    let body = '';
    if (modal.type === 'transfer') {
      const to = typeof targetProgram === 'number' ? allPrograms.find(p => p.id === targetProgram) : null;
      subject = `[Transfer Request] Enrollment #${e.id}`;
      body = [
        'Dear Mubeen Academy Team,',
        '',
        'I would like to request a transfer for my enrollment.',
        `Enrollment ID: ${e.id}`,
        `Current Program: ${prog?.title || `Program ${e.program_id}`} (ID ${e.program_id})`,
        `Requested Program: ${to?.title || '(please specify)'}${to ? ` (ID ${to.id})` : ''}`,
        `Reason: ${reason || '(please see details below)'} `,
        '',
        `Contact email: ${contactEmail || '(your email)'}`,
        '',
        'Thank you for your assistance.',
        '',
        'Regards,',
        contactEmail || ''
      ].join('\n');
    } else if (modal.type === 'defer') {
      subject = `[Defer Request] Enrollment #${e.id}`;
      body = [
        'Dear Mubeen Academy Team,',
        '',
        'I would like to request a deferment for my enrollment.',
        `Enrollment ID: ${e.id}`,
        `Program: ${prog?.title || `Program ${e.program_id}`} (ID ${e.program_id})`,
        `Reason: ${reason || '(please see details below)'} `,
        '',
        `Contact email: ${contactEmail || '(your email)'}`,
        '',
        'Thank you for your assistance.',
        '',
        'Regards,',
        contactEmail || ''
      ].join('\n');
    } else if (modal.type === 'quit') {
      subject = `[End Program Request] Enrollment #${e.id}`;
      body = [
        'Dear Mubeen Academy Team,',
        '',
        'I would like to request to end my program.',
        `Enrollment ID: ${e.id}`,
        `Program: ${prog?.title || `Program ${e.program_id}`} (ID ${e.program_id})`,
        `Reason: ${reason || '(please see details below)'} `,
        '',
        `Contact email: ${contactEmail || '(your email)'}`,
        '',
        'Thank you for your assistance.',
        '',
        'Regards,',
        contactEmail || ''
      ].join('\n');
    }
    return { subject, body };
  }, [modal, reason, targetProgram, programs, allPrograms, contactEmail]);

  // Ensure external links open correctly without adding localhost
  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url;
    return `https://${url}`;
  };

  const openMailClient = () => {
    const to = 'mubeenacademy001@gmail.com';
    const href = `mailto:${to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.location.href = href;
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-6 py-24">
      <div className="container-page space-y-6">
        <div className="card">
          <div className="card-body flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold mr-auto">My Registrations</h1>
            <select className="input w-40" aria-label="Filter by status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
              <option value="all">All statuses</option>
              <option value="draft">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="registered">Registered</option>
              <option value="updated">Updated</option>
            </select>
            <select className="input w-40" aria-label="Filter by payment" value={filterPayment} onChange={(e) => setFilterPayment(e.target.value as any)}>
              <option value="all">All payments</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="card"><div className="card-body">Loading…</div></div>
        ) : filtered.length === 0 ? (
          <div className="card"><div className="card-body">No registrations found.</div></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(e => {
                  const p = programs[e.program_id];
                  const unpaid = (e.payment_status || 'unpaid') === 'unpaid';
                  const deferred = !!e.defer_active;
                return (
                  <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{p?.title || `Program ${e.program_id}`}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Started: {new Date(e.created_at).toLocaleString()}</p>
                        <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))] space-y-1">
                          {p?.duration && <p>Duration: <span className="text-[hsl(var(--foreground))]">{(p as any).duration}</span></p>}
                          {(p as any)?.start_date && <p>Start: <span className="text-[hsl(var(--foreground))]">{(p as any).start_date}</span></p>}
                          {Array.isArray((p as any)?.instructors) && (p as any).instructors[0]?.name && (
                            <p>Instructor: <span className="text-[hsl(var(--foreground))]">{(p as any).instructors[0].name}</span></p>
                          )}
                        </div>
                      </div>
                    <span className={`badge ${deferred ? 'bg-orange-100 text-orange-700' : unpaid ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]' : 'bg-green-100 text-green-700'}`}>{deferred ? 'deferred' : (e.payment_status || 'unpaid')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    {unpaid && <button className="btn-primary" onClick={() => payNow(e)}>Pay Now</button>}
                    {deferred ? (
                      <button className="btn-ghost cursor-not-allowed opacity-70" disabled>Deferred</button>
                    ) : e.payment_status === 'paid' && e.classroom_link && (e as any).classroom_enabled ? (
                      <a className="btn-primary" href={ensureAbsoluteUrl(e.classroom_link || '')} target="_blank" rel="noopener noreferrer">Join the classroom</a>
                    ) : (
                      <Link className="btn-outline" href={p?.slug ? `/register?program=${p.slug}` : '/programs'}>Continue</Link>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button className="btn-outline" onClick={() => { window.location.href = `/dashboard/registrations/request?type=transfer&id=${e.id}`; }}>Transfer</button>
                    <button className="btn-outline" onClick={() => { window.location.href = `/dashboard/registrations/request?type=defer&id=${e.id}`; }}>Defer</button>
                    <button className="btn-outline" onClick={() => { window.location.href = `/dashboard/registrations/request?type=quit&id=${e.id}`; }}>End Program</button>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <a href="mailto:mubeenacademy001@gmail.com" className="btn-outline">Contact Support</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

