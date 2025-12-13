"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from 'next/navigation';

declare const FlutterwaveCheckout: any;

type Enrollment = {
  id: number;
  program_id: number;
  user_id: string;
  status: string | null;
  payment_status: string | null;
  created_at: string;
  duration_months: number | null;
  plan_id: number | null;
  amount: number | null;
  currency: string | null;
  classroom_link?: string | null;
  classroom_enabled?: boolean | null;
  defer_active?: boolean | null;
  completed_at?: string | null;
  is_family?: boolean | null;
  family_size?: number | null;
  is_draft?: boolean;
};

type Program = {
  id: number;
  title: string;
  slug: string;
  image_url?: string | null;
  duration?: string | null;
  start_date?: string | null;
  language?: string | null;
  level?: string | null;
  overview?: string | null;
  schedule?: string | null;
  instructors?: { name?: string; title?: string; avatar_url?: string }[] | null;
};

type Plan = { id: number; price: number; currency: string };

export default function DashboardRegistrationsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [successPayments, setSuccessPayments] = useState<Array<{ id: number; program_id: number|null; skill_id: number|null; program_title: string|null; amount: number|null; currency: string|null; created_at: string; type: string; status: string }>>([]);
  const [programs, setPrograms] = useState<Record<number, Program>>({});
  const [skills, setSkills] = useState<Record<number, { id: number; title: string; slug?: string }>>({});
  const [plans, setPlans] = useState<Record<number, Plan>>({});
  const [classLinks, setClassLinks] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user?.email) setUserEmail(user.email);
    if (!user) { setLoading(false); return; }
    
    const { data: enr } = await supabase
      .from('enrollments')
      .select('id, program_id, user_id, status, payment_status, created_at, duration_months, plan_id, amount, currency, classroom_link, classroom_enabled, defer_active, completed_at, is_draft, is_family, family_size')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const list = (enr as Enrollment[]) || [];
    setEnrollments(list);
    
    const pids = Array.from(new Set(list.map(e => e.program_id)));
    if (pids.length) {
      const { data: progs } = await supabase.from('programs').select('id,title,slug,image_url,duration,start_date,language,level,overview,schedule,instructors').in('id', pids);
      const pm: Record<number, Program> = {};
      (progs as Program[] | null)?.forEach(p => { pm[p.id] = p; });
      setPrograms(pm);
    }
    
    const planIds = Array.from(new Set(list.map(e => e.plan_id).filter(Boolean))) as number[];
    if (planIds.length) {
      const { data: planRows } = await supabase.from('program_plans').select('id, price, currency').in('id', planIds);
      const pl: Record<number, Plan> = {};
      (planRows as Array<{id: number; price: string | number; currency: string}> | null)?.forEach(r => { 
        pl[r.id] = { id: r.id, price: Number(r.price), currency: r.currency || 'NGN' }; 
      });
      setPlans(pl);
    }

    // Load success_enroll payments for this user
    const { data: seRows } = await supabase
      .from('success_enroll')
      .select('id, program_id, skill_id, program_title, amount, currency, created_at, type, user_email, status, category')
      .or(`user_id.eq.${user.id},user_email.eq.${user.email ?? ''}`)
      .order('created_at', { ascending: false });
    
    // Include both 'paid' and 'pending' for visibility
    const seList = ((seRows as any[]) || []).filter(r => r?.status === 'paid' || r?.status === 'pending');
    setSuccessPayments(seList);
    const paid = seList.filter(r => r.status === 'paid');

    // Fetch skills if needed
    const skillIds = new Set<number>();
    seList.forEach(r => { if(r.skill_id) skillIds.add(r.skill_id); });
    if(skillIds.size > 0) {
      const { data: sk } = await supabase.from('skills').select('id, title, slug').in('id', Array.from(skillIds));
      const sm: Record<number, { id: number; title: string; slug?: string }> = {};
      (sk as any[] || []).forEach(s => { sm[s.id] = s; });
      setSkills(sm);
    }

    // Fetch classroom links for paid enrollments
    if (paid.length > 0) {
      const enrollmentIds = paid.map((p: any) => p.id);
      const { data: linksData } = await supabase
        .from('class_links')
        .select('enrollment_id, classroom_link')
        .in('enrollment_id', enrollmentIds);
      
      if (linksData) {
        const linksMap: Record<number, string> = {};
        linksData.forEach((link: {enrollment_id: number; classroom_link: string}) => {
          linksMap[link.enrollment_id] = link.classroom_link;
        });
        setClassLinks(linksMap);
      }
    }

    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const inProgress = useMemo(() => {
    // Show only success_enroll records per product requirement
    return [] as Enrollment[];
  }, []);

  const completed = useMemo(() => {
    // Show only success_enroll records per product requirement
    return [] as Enrollment[];
  }, []);

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

  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url;
    return `https://${url}`;
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-6 py-24">
      <div className="container-page space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Registrations</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Manage your program enrollments and access learning materials</p>
          </div>
          <button onClick={() => load()} className="btn-outline">Refresh</button>
        </div>

        {loading ? (
          <div className="card">
            <div className="card-body text-center text-[hsl(var(--muted-foreground))]">Loading…</div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* In Progress Enrollments (hidden) */}
            {false && inProgress.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Registration In Progress</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {inProgress.map(e => {
                    const p = programs[e.program_id];
                    const isPaid = (e.payment_status || 'unpaid') === 'paid';
                    return (
                      <div key={e.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm p-4 flex flex-col gap-4">
                        {/* Program Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{p?.title || `Program ${e.program_id}`}</h3>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Enrolled: {new Date(e.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className="badge bg-blue-100 text-blue-700 text-xs">In Progress</span>
                        </div>

                        {/* Program Details */}
                        <div className="text-sm space-y-2 pb-3 border-b border-[hsl(var(--border))]">
                          {p?.duration && (
                            <div className="flex items-center justify-between">
                              <span className="text-[hsl(var(--muted-foreground))]">Duration:</span>
                              <span className="font-medium">{p.duration}</span>
                            </div>
                          )}
                          {p?.start_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-[hsl(var(--muted-foreground))]">Start Date:</span>
                              <span className="font-medium">{p.start_date}</span>
                            </div>
                          )}
                          {p?.schedule && (
                            <div className="flex items-center justify-between">
                              <span className="text-[hsl(var(--muted-foreground))]">Schedule:</span>
                              <span className="font-medium">{p.schedule}</span>
                            </div>
                          )}
                          {Array.isArray(p?.instructors) && p.instructors.length > 0 && p.instructors[0]?.name && (
                            <div className="flex items-center justify-between">
                              <span className="text-[hsl(var(--muted-foreground))]">Instructor:</span>
                              <span className="font-medium">{p.instructors[0].name}</span>
                            </div>
                          )}
                        </div>

                        {/* Payment Status */}
                        <div className="bg-[hsl(var(--muted))] rounded p-3 text-sm">
                          <p className="text-[hsl(var(--muted-foreground))] mb-1">Payment Status:</p>
                          <p className="font-semibold">{isPaid ? 'Paid' : 'Unpaid'}</p>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2">
                          {!isPaid && <button className="btn-primary" onClick={() => payNow(e)}>Pay Now</button>}
                          <Link className="btn-outline" href={p?.slug ? `/register?program=${p.slug}` : '/programs'}>
                            {!isPaid ? 'Complete Form' : 'Continue'}
                          </Link>
                        </div>

                        {/* Contact Support */}
                        <a href="mailto:mubeenacademy001@gmail.com" className="btn-outline text-center">
                          Contact Support
                        </a>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Completed/Active Enrollments (hidden) */}
            {false && completed.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Active Programs</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {completed.map(e => {
                    const p = programs[e.program_id];
                    const deferred = !!e.defer_active;
                    const hasClassroomAccess = e.classroom_enabled && e.classroom_link;
                    return (
                      <div key={e.id} className="rounded-xl border border-green-200 bg-green-50/30 shadow-sm p-4 flex flex-col gap-4">
                        {/* Program Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{p?.title || `Program ${e.program_id}`}</h3>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Enrolled: {new Date(e.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`badge text-xs ${
                            deferred 
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {deferred ? 'Deferred' : 'Paid'}
                          </span>
                        </div>

                        {/* Program Details */}
                        <div className="text-sm space-y-2 pb-3 border-b border-green-200">
                          {p?.duration && (
                            <div className="flex items-center justify-between">
                              <span className="text-[hsl(var(--muted-foreground))]">Duration:</span>
                              <span className="font-medium">{p.duration}</span>
                            </div>
                          )}
                          {p?.start_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-[hsl(var(--muted-foreground))]">Start Date:</span>
                              <span className="font-medium">{p.start_date}</span>
                            </div>
                          )}
                          {p?.schedule && (
                            <div className="flex items-center justify-between">
                              <span className="text-[hsl(var(--muted-foreground))]">Schedule:</span>
                              <span className="font-medium">{p.schedule}</span>
                            </div>
                          )}
                          {Array.isArray(p?.instructors) && p.instructors.length > 0 && p.instructors[0]?.name && (
                            <div className="flex items-center justify-between">
                              <span className="text-[hsl(var(--muted-foreground))]">Instructor:</span>
                              <span className="font-medium">{p.instructors[0].name}</span>
                            </div>
                          )}
                        </div>

                        {/* Classroom Access */}
                        {hasClassroomAccess && e.classroom_link && (
                          <div>
                            <a 
                              href={ensureAbsoluteUrl(e.classroom_link)}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-primary w-full text-center"
                              aria-label={`Join classroom for ${p?.title || 'program'}`}
                            >
                              Join Classroom
                            </a>
                          </div>
                        )}

                        {/* Category Info */}
                        {e.is_family && (
                          <div className="bg-blue-50 rounded p-2 text-xs text-blue-700">
                            Family Enrollment - {e.family_size} members
                          </div>
                        )}

                        {/* Contact Support */}
                        <a href="mailto:mubeenacademy001@gmail.com" className="btn-outline text-center">
                          Contact Support
                        </a>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* My Enrollments from success_enroll */}
            {successPayments.length > 0 && (
              <section aria-labelledby="my-enrollments-heading">
                <h2 id="my-enrollments-heading" className="text-xl font-semibold mb-4">My Enrollments</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {successPayments.map((r) => (
                    <article key={r.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          {r.program_title || (r.program_id 
                            ? `Program ${r.program_id}` 
                            : (r.skill_id 
                                ? (skills[r.skill_id]?.title || `Skill ${r.skill_id}`)
                                : r.type))
                          }
                        </h3>
                        <span className={`badge text-xs ${r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.status === 'paid' ? 'Paid' : 'Pending Payment'}
                        </span>
                      </div>
                      <div className="text-sm">
                        {/* Category removed in unified model */}
                        <p><span className="text-[hsl(var(--muted-foreground))] mr-1">Amount:</span>{r.currency || 'NGN'} {Number(r.amount || 0).toLocaleString()}</p>
                        <p className="text-[hsl(var(--muted-foreground))]">{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-2">
                         {r.status === 'pending' && (
                           <a
                              href={`/payment?${r.skill_id ? `skill=${r.skill_id}` : `program=${r.program_id}`}${r.id ? `&se=${r.id}` : ''}`}
                              className="btn-primary flex-1 text-center"
                           >
                             Pay Now
                           </a>
                         )}
                         {/* Join Classroom Button (only if paid) */}
                         {r.status === 'paid' && classLinks[r.id] && (
                          <a
                            href={ensureAbsoluteUrl(classLinks[r.id])}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary flex-1 text-center"
                            aria-label={`Join classroom for ${r.program_title || r.type}`}
                          >
                            Join Classroom
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* No Enrollments */}
            {successPayments.length === 0 && (
              <div className="card">
                <div className="card-body text-center py-12">
                  <p className="text-[hsl(var(--muted-foreground))] mb-4">You haven’t enrolled in any programs yet</p>
                  <Link href="/programs" className="btn-primary inline-block">
                    Browse Programs
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

