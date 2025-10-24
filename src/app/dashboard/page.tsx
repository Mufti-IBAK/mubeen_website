"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { FiUser, FiClipboard, FiSend, FiMoon, FiClock } from 'react-icons/fi';
import { useUserDrafts } from '@/hooks/useDraftRegistration';

type Enrollment = { id: number; program_id: number; status: string|null; payment_status: string|null; created_at: string; duration_months: number|null; classroom_link: string|null; plan_id: number|null; defer_active?: boolean|null };

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name?: string; phone?: string; country?: string; dark_mode?: boolean; months_remaining?: number; role?: string; updated_at?: string } | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programsMap, setProgramsMap] = useState<Record<number, { id: number; title: string; slug?: string }>>({});
  const [loading, setLoading] = useState(true);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Load user drafts
  const { drafts, isLoading: draftsLoading, refreshDrafts } = useUserDrafts();

  useGSAP(() => {
    if (!cardsRef.current) return;
    gsap.from(cardsRef.current.querySelectorAll('.dash-card'), { y: 30, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' });
  }, { scope: cardsRef });

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) { setLoading(false); return; }
      setEmail(user.email ?? null);
      setUserId(user.id);
      const { data: p } = await supabase.from('profiles').select('full_name, phone, country, dark_mode, months_remaining, role, updated_at').eq('id', user.id).single();
      setProfile((p as any) || null);
      // load enrollments
      const { data: enr } = await supabase
        .from('enrollments')
        .select('id, program_id, status, payment_status, created_at, duration_months, classroom_link, plan_id, defer_active, is_draft')
        .eq('user_id', user.id)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });
      const list = (enr as Enrollment[]) || [];
      setEnrollments(list);
      const ids = Array.from(new Set(list.map(e => e.program_id)));
      if (ids.length) {
        const { data: progs } = await supabase.from('programs').select('id, title, slug').in('id', ids);
        const map: Record<number, { id: number; title: string; slug?: string }> = {};
        (progs as any[] | null)?.forEach(pr => { map[pr.id] = pr; });
        setProgramsMap(map);
      }
      setLoading(false);
    };
    init();
  }, []);

  const toggleDark = async () => {
    if (!profile) return;
    const next = !profile.dark_mode;
    setProfile({ ...profile, dark_mode: next });
    document.documentElement.classList.toggle('dark', next);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) await supabase.from('profiles').update({ dark_mode: next }).eq('id', user.id);
  };

  // progress removed

  // Normalize external links to avoid localhost prefixing
  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url;
    return `https://${url}`;
  };

  if (loading) {
    return (
      <div className="bg-[hsl(var(--background))] min-h-screen flex items-center justify-center"><p className="text-[hsl(var(--muted-foreground))]">Loading dashboard...</p></div>
    );
  }

  if (!email) {
    return (
      <div className="bg-[hsl(var(--background))] min-h-screen flex items-center justify-center">
        <div className="card text-center">
          <div className="card-body">
            <p className="mb-4 text-[hsl(var(--muted-foreground))]">You are not logged in.</p>
            <Link href="/login" className="btn-primary">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[hsl(var(--background))] min-h-screen px-6 py-24">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-1">Welcome{profile?.full_name ? ', ' : ''}<span className="bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 bg-clip-text text-transparent">{profile?.full_name || ''}</span></h1>
            {enrollments[0] && (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Enrollment ID: <span className="font-semibold text-[hsl(var(--foreground))]">#{enrollments[0].id}</span></p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
              <Link href="/admin" className="btn-outline">Admin</Link>
            )}
            <Link href="/dashboard/registrations" className="btn-primary">My Registrations</Link>
            <Link href="/programs" className="btn-outline">Browse Programs</Link>
          </div>
        </div>

        <div ref={cardsRef} className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="dash-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-shadow hover:shadow-md">
            <h2 className="text-base font-semibold mb-1 inline-flex items-center gap-2"><FiUser className="opacity-70" /> Account</h2>
            <p className="text-[hsl(var(--muted-foreground))]">Email: {email}</p>
            <p className="text-[hsl(var(--muted-foreground))]">Role: {profile?.role ?? 'Student'}</p>
            {profile?.country && <p className="text-[hsl(var(--muted-foreground))]">Country: {profile.country}</p>}
            <div className="mt-4 flex items-center gap-2">
              <button className="btn-outline" onClick={() => setShowProfileModal(true)}>Update Profile</button>
            </div>
          </div>

          <div className="dash-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-shadow hover:shadow-md">
            <h2 className="text-base font-semibold mb-1 inline-flex items-center gap-2"><FiClipboard className="opacity-70" /> My Enrollment(s)</h2>
            {enrollments.length === 0 ? (
              <>
                <p className="text-[hsl(var(--muted-foreground))]">You have no registrations yet.</p>
                <Link href="/programs" className="inline-block mt-2 btn-primary">Browse Programs</Link>
              </>
            ) : (
              (() => {
                const e = enrollments[0];
                return (
                  <div className="rounded border border-[hsl(var(--border))] p-3 mt-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold leading-tight">{programsMap[e.program_id]?.title || `Program ${e.program_id}`}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Enrollment #{e.id} • {new Date(e.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${e.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'}`}>{e.payment_status || 'pending'}</span>
                        {e.defer_active ? <span className="badge bg-orange-100 text-orange-700">Deferred</span> : null}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <Link className="btn-outline" href="/dashboard/registrations">View all</Link>
                      <button className="btn-outline" onClick={() => { window.location.href = `/dashboard/registrations/request?type=transfer&id=${e.id}`; }}>Transfer</button>
                      <button className="btn-outline" onClick={() => { window.location.href = `/dashboard/registrations/request?type=defer&id=${e.id}`; }}>Defer</button>
                      <button className="btn-outline" onClick={() => { window.location.href = `/dashboard/registrations/request?type=quit&id=${e.id}`; }}>End Program</button>
                      {e.classroom_link && e.payment_status === 'paid' ? (
                        <a href={ensureAbsoluteUrl(e.classroom_link)} target="_blank" rel="noreferrer" className="btn-primary">Classroom</a>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="dash-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-shadow hover:shadow-md">
            <h2 className="text-base font-semibold mb-1 inline-flex items-center gap-2"><FiSend className="opacity-70" /> Quick actions</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                <Link href="/admin" className="btn-outline">Admin Dashboard</Link>
              )}
              <Link href="/dashboard/registrations" className="btn-primary">My Registrations</Link>
              <Link href="/programs" className="btn-outline">Browse Programs</Link>
              <a href="mailto:mubeenacademy001@gmail.com" className="btn-outline">Contact Support</a>
            </div>
          </div>
          <div className="dash-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-shadow hover:shadow-md">
            <h2 className="text-base font-semibold mb-1 inline-flex items-center gap-2"><FiMoon className="opacity-70" /> Preferences</h2>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Dark Mode</span>
              <button onClick={toggleDark} className={`px-3 py-1 rounded ${profile?.dark_mode ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'}`}>{profile?.dark_mode ? 'On' : 'Off'}</button>
            </div>
          </div>
        </div>

        <div className="mt-8 card">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-3 inline-flex items-center gap-2">
              <FiClock className="opacity-70" />
              Registration in Progress
            </h3>
            {draftsLoading ? (
              <p className="text-[hsl(var(--muted-foreground))]">Loading saved drafts...</p>
            ) : drafts.length === 0 ? (
              <p className="text-[hsl(var(--muted-foreground))]">No registrations in progress.</p>
            ) : (
              <div className="space-y-3">
                {drafts.map(draft => (
                  <div key={draft.id} className="flex items-center justify-between rounded border border-[hsl(var(--border))] p-4 bg-[hsl(var(--muted))]/30">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{draft.program_title || 'Program Registration'}</p>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                          {draft.registration_type === 'individual' ? 'Individual' : 
                           draft.registration_type === 'family_head' ? 'Family Head' : 'Family Member'}
                        </span>
                      </div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">
                        Last edited: {new Date(draft.last_edited_at).toLocaleString()}
                      </p>
                      {draft.family_size && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Family size: {draft.family_size} members
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/enroll?program=${(draft as any).program_slug ?? draft.program_id}`} 
                        className="btn-primary"
                        onClick={refreshDrafts}
                      >
                        Continue
                      </Link>
                      <button 
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this draft?')) {
                            try {
                              const response = await fetch(`/api/drafts?id=${draft.id}`, {
                                method: 'DELETE'
                              });
                              if (response.ok) {
                                refreshDrafts();
                              }
                            } catch (error) {
                              console.error('Failed to delete draft:', error);
                            }
                          }
                        }}
                        className="btn-outline text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowProfileModal(false)} />
          <div className="relative z-10 w-full max-w-md card">
            <div className="card-body">
              <h3 className="text-lg font-semibold mb-3">Update Profile</h3>
              <ProfileUpdateForm initial={profile || {}} onUpdated={(p) => { setProfile(p); setShowProfileModal(false); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileUpdateForm({ initial, onUpdated }: { initial: { full_name?: string; phone?: string; country?: string; updated_at?: string }; onUpdated: (p: any) => void }) {
  const [fullName, setFullName] = useState(initial.full_name || '');
  const [phone, setPhone] = useState(initial.phone || '');
  const [country, setCountry] = useState(initial.country || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const lastUpdated = initial.updated_at ? new Date(initial.updated_at).getTime() : 0;
  const canUpdate = lastUpdated === 0 || (Date.now() - lastUpdated) > (30 * 24 * 60 * 60 * 1000);
  const nextAllowed = lastUpdated ? new Date(lastUpdated + 30*24*60*60*1000).toLocaleString() : null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) {
      if (!canUpdate) { setMsg(`You can update your profile after ${nextAllowed}`); setSaving(false); return; }
      const { error } = await supabase.from('profiles').update({ full_name: fullName, phone, country }).eq('id', user.id);
      if (error) {
        setMsg(error.message);
      } else {
        setMsg('Saved');
        // Re-fetch updated profile and notify parent
        const { data: p2 } = await supabase.from('profiles').select('full_name, phone, country, dark_mode, months_remaining, role, updated_at').eq('id', user.id).single();
        onUpdated(p2 || {});
      }
    }
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-3">
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="input" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="input" />
      <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="input" />
      <button disabled={saving || !canUpdate} className="btn-primary">{saving ? 'Saving…' : 'Save Profile'}</button>
      {!canUpdate && nextAllowed && <p className="text-sm text-[hsl(var(--muted-foreground))]">You can update again after {nextAllowed}</p>}
      {msg && <p className="text-sm text-[hsl(var(--muted-foreground))]">{msg}</p>}
    </form>
  );
}

