"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { FiUser, FiClipboard, FiSend, FiMoon } from "react-icons/fi";
import { useRouter } from "next/navigation";

type Enrollment = {
  id: number;
  program_id: number;
  status: string | null;
  payment_status: string | null;
  created_at: string;
  duration_months: number | null;
  classroom_link: string | null;
  plan_id: number | null;
  defer_active?: boolean | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    full_name?: string;
    phone?: string;
    whatsapp_number?: string;
    country?: string;
    dark_mode?: boolean;
    months_remaining?: number;
    role?: string;
    updated_at?: string;
  } | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programsMap, setProgramsMap] = useState<
    Record<number, { id: number; title: string; slug?: string }>
  >({});
  const [skillsMap, setSkillsMap] = useState<
    Record<number, { id: number; title: string; slug?: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [seCount, setSeCount] = useState(0);
  const [seLatest, setSeLatest] = useState<
    Array<{
      id: number;
      program_title: string | null;
      program_id: number | null;
      skill_id: number | null;
      created_at: string;
      type?: string;
    }>
  >([]);
  const [unpaid, setUnpaid] = useState<
    Array<{
      id: number;
      se_id: number | null;
      program_id: number | null;
      skill_id: number | null;
      program_title: string | null;
      created_at: string;
      category?: string;
      type?: string;
    }>
  >([]);
  const cardsRef = useRef<HTMLDivElement>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useGSAP(
    () => {
      if (!cardsRef.current) return;
      const scope = cardsRef.current;
      const tl = gsap.timeline();
      tl.from(scope.querySelectorAll(".dash-card"), {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power3.out",
      }).from(
        scope.querySelectorAll(".unpaid-card"),
        { y: 20, opacity: 0, stagger: 0.05, duration: 0.5, ease: "power2.out" },
        "<"
      );
    },
    { scope: cardsRef }
  );

  const load = React.useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      return;
    }
    setEmail(user.email ?? null);
    setUserId(user.id);
    const { data: p } = await supabase
      .from("profiles")
      .select(
        "full_name, phone, whatsapp_number, country, dark_mode, months_remaining, role, updated_at"
      )
      .eq("id", user.id)
      .single();
    setProfile((p as any) || null);
    // load enrollments
    const { data: enr } = await supabase
      .from("enrollments")
      .select(
        "id, program_id, status, payment_status, created_at, duration_months, classroom_link, plan_id, defer_active, is_draft"
      )
      .eq("user_id", user.id)
      .eq("is_draft", false)
      .order("created_at", { ascending: false });
    const list = (enr as Enrollment[]) || [];
    setEnrollments(list);
    const ids = Array.from(new Set(list.map((e) => e.program_id)));
    if (ids.length) {
      const { data: progs } = await supabase
        .from("programs")
        .select("id, title, slug")
        .in("id", ids);
      const map: Record<number, { id: number; title: string; slug?: string }> =
        {};
      (progs as any[] | null)?.forEach((pr) => {
        map[pr.id] = pr;
      });
      setProgramsMap(map);
    }
    // Load success_enroll summary for this user (count and latest 3)
    const { data: se } = await supabase
      .from("success_enroll")
      .select(
        "id, program_id, skill_id, program_title, created_at, user_email, type"
      )
      .or(`user_id.eq.${user.id},user_email.eq.${user.email ?? ""}`)
      .order("created_at", { ascending: false });
    const rows = (se as Array<any>) || [];
    setSeCount(rows.length);
    setSeLatest(
      rows
        .slice(0, 3)
        .map((r) => ({
          id: r.id,
          program_id: r.program_id,
          skill_id: r.skill_id,
          program_title: r.program_title,
          created_at: r.created_at,
          type: r.type,
        }))
    );

    // Load unpaid enrollments from success_enroll (status=pending)
    const { data: ueRows } = await supabase
      .from("success_enroll")
      .select(
        "id, program_id, skill_id, program_title, created_at, user_email, form_data, category, status, type"
      )
      .eq("status", "pending")
      .or(`user_id.eq.${user.id},user_email.eq.${user.email ?? ""}`)
      .order("created_at", { ascending: false });
    setUnpaid(
      ((ueRows as any[]) || []).map((r) => ({
        id: r.id,
        se_id: r.id,
        program_id: r.program_id,
        skill_id: r.skill_id,
        program_title: r.program_title,
        created_at: r.created_at,
        category:
          r.category ||
          (r as any).form_data?.category ||
          ((r as any).form_data?.family_size
            ? `family_${(r as any).form_data?.family_size}`
            : "individual"),
        type: r.type,
      }))
    );

    // Fetch skills if present
    const sids = new Set<number>();
    rows.forEach((r) => {
      if (r.skill_id) sids.add(r.skill_id);
    });
    ((ueRows as any[]) || []).forEach((r) => {
      if (r.skill_id) sids.add(r.skill_id);
    });
    if (sids.size > 0) {
      const { data: sk } = await supabase
        .from("skills")
        .select("id, title, slug")
        .in("id", Array.from(sids));
      const sm: Record<number, { id: number; title: string; slug?: string }> =
        {};
      ((sk as any[]) || []).forEach((s) => {
        sm[s.id] = s;
      });
      setSkillsMap(sm);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDark = async () => {
    if (!profile) return;
    const next = !profile.dark_mode;
    setProfile({ ...profile, dark_mode: next });
    document.documentElement.classList.toggle("dark", next);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user)
      await supabase
        .from("profiles")
        .update({ dark_mode: next })
        .eq("id", user.id);
  };

  // progress removed

  // Normalize external links to avoid localhost prefixing
  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url;
    return `https://${url}`;
  };

  if (loading) {
    return (
      <div className="bg-[hsl(var(--background))] min-h-screen flex items-center justify-center">
        <p className="text-[hsl(var(--muted-foreground))]">
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="bg-[hsl(var(--background))] min-h-screen flex items-center justify-center">
        <div className="card text-center">
          <div className="card-body">
            <p className="mb-4 text-[hsl(var(--muted-foreground))]">
              You are not logged in.
            </p>
            <Link href="/login" className="btn-primary">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main
      className="bg-[hsl(var(--background))] min-h-screen px-6 py-24"
      role="main"
      aria-label="User dashboard"
    >
      <div className="container-page">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-1">
              Welcome{profile?.full_name ? ", " : ""}
              <span className="bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 bg-clip-text text-transparent">
                {profile?.full_name || ""}
              </span>
            </h1>
            {enrollments[0] && (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Enrollment ID:{" "}
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  #{enrollments[0].id}
                </span>
              </p>
            )}
          </div>
          <nav
            className="flex items-center gap-2"
            aria-label="Primary navigation"
          >
            <button
              onClick={() => load()}
              className="btn-outline"
              aria-label="Refresh dashboard data"
            >
              Refresh
            </button>
            {(profile?.role === "admin" || profile?.role === "super_admin") && (
              <Link
                href="/admin"
                className="btn-outline"
                aria-label="Go to admin dashboard"
              >
                Admin
              </Link>
            )}
            <Link
              href="/dashboard/registrations"
              className="btn-primary"
              aria-label="View my registrations"
            >
              My Registrations
            </Link>
            <Link
              href="/programs"
              className="btn-outline"
              aria-label="Browse available programs"
            >
              Browse Programs
            </Link>
          </nav>
        </header>

        <div
          ref={cardsRef}
          className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left rail */}
          <aside className="space-y-4" aria-label="Account information">
            <section
              className="dash-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-shadow hover:shadow-md"
              aria-labelledby="account-heading"
            >
              <h2
                id="account-heading"
                className="text-base font-semibold mb-1 inline-flex items-center gap-2"
              >
                <FiUser className="opacity-70" aria-hidden="true" /> Account
              </h2>
              <p className="text-[hsl(var(--muted-foreground))]">
                Email: {email}
              </p>
              <p className="text-[hsl(var(--muted-foreground))]">
                Role: {profile?.role ?? "Student"}
              </p>
              {profile?.country && (
                <p className="text-[hsl(var(--muted-foreground))]">
                  Country: {profile.country}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2">
                <button
                  className="btn-outline"
                  onClick={() => setShowProfileModal(true)}
                  aria-label="Open profile update form"
                >
                  Update Profile
                </button>
              </div>
            </section>

            <section
              className="dash-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-shadow hover:shadow-md"
              aria-labelledby="quickactions-heading"
            >
              <h2
                id="quickactions-heading"
                className="text-base font-semibold mb-1 inline-flex items-center gap-2"
              >
                <FiSend className="opacity-70" aria-hidden="true" /> Quick
                actions
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {(profile?.role === "admin" ||
                  profile?.role === "super_admin") && (
                  <Link href="/admin" className="btn-outline">
                    Admin Dashboard
                  </Link>
                )}
                <Link href="/dashboard/registrations" className="btn-primary">
                  My Registrations
                </Link>
                <Link href="/programs" className="btn-outline">
                  Browse Programs
                </Link>
                <a
                  href="mailto:mubeenacademy001@gmail.com"
                  className="btn-outline"
                  aria-label="Send email to support"
                >
                  Contact Support
                </a>
              </div>
            </section>

            <section
              className="dash-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-shadow hover:shadow-md"
              aria-labelledby="preferences-heading"
            >
              <h2
                id="preferences-heading"
                className="text-base font-semibold mb-1 inline-flex items-center gap-2"
              >
                <FiMoon className="opacity-70" aria-hidden="true" /> Preferences
              </h2>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">
                  Dark Mode
                </span>
                <button
                  onClick={toggleDark}
                  className={`px-3 py-1 rounded ${
                    profile?.dark_mode
                      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                      : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                  }`}
                  aria-label={`Toggle dark mode, currently ${
                    profile?.dark_mode ? "on" : "off"
                  }`}
                  aria-pressed={profile?.dark_mode}
                >
                  {profile?.dark_mode ? "On" : "Off"}
                </button>
              </div>
            </section>
          </aside>

          {/* Main rail */}
          <section
            className="lg:col-span-2 space-y-6"
            aria-label="Enrollment information"
          >
            <article
              className="dash-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-shadow hover:shadow-md"
              aria-labelledby="enrollments-heading"
            >
              <h2
                id="enrollments-heading"
                className="text-base font-semibold mb-1 inline-flex items-center gap-2"
              >
                <FiClipboard className="opacity-70" aria-hidden="true" /> My
                Enrollment(s)
              </h2>
              {seCount === 0 ? (
                <>
                  <p className="text-[hsl(var(--muted-foreground))]">
                    You have no registrations yet.
                  </p>
                  <Link
                    href="/programs"
                    className="inline-block mt-2 btn-primary"
                  >
                    Browse Programs
                  </Link>
                </>
              ) : (
                <div className="rounded border border-[hsl(var(--border))] p-3 mt-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold leading-tight">
                        {seLatest[0]?.program_id
                          ? seLatest[0]?.program_title ||
                            `Program ${seLatest[0]?.program_id}`
                          : seLatest[0]?.skill_id
                          ? skillsMap[seLatest[0].skill_id]?.title ||
                            `Skill ${seLatest[0].skill_id}`
                          : seLatest[0]?.type === "donation"
                          ? "Donation"
                          : "Other Payment"}
                      </p>
                      {seLatest[0] && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Applied{" "}
                          {new Date(
                            seLatest[0].created_at
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className="badge bg-green-100 text-green-700">
                      {seCount} total
                    </span>
                  </div>
                  {seLatest.length > 1 && (
                    <ul className="mt-2 text-sm list-disc list-inside text-[hsl(var(--muted-foreground))]">
                      {seLatest.slice(1).map((r) => (
                        <li key={r.id}>
                          {r.program_id
                            ? r.program_title ||
                              programsMap[r.program_id]?.title ||
                              `Program ${r.program_id}`
                            : r.skill_id
                            ? skillsMap[r.skill_id]?.title ||
                              `Skill ${r.skill_id}`
                            : "Item"}
                          · {new Date(r.created_at).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      className="btn-outline"
                      href="/dashboard/registrations"
                    >
                      View all
                    </Link>
                    <Link className="btn-outline" href="/programs">
                      Browse programs
                    </Link>
                  </div>
                </div>
              )}
            </article>

            <article
              className="dash-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-shadow hover:shadow-md"
              aria-labelledby="unpaid-heading"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 id="unpaid-heading" className="text-lg font-semibold">
                  Unpaid enrollments
                </h2>
                {unpaid.length > 0 && (
                  <span className="badge bg-amber-100 text-amber-700">
                    {unpaid.length}
                  </span>
                )}
              </div>
              {unpaid.length === 0 ? (
                <p className="text-[hsl(var(--muted-foreground))]">
                  No unpaid enrollments.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {unpaid.map((u) => (
                    <div
                      key={`${u.id}-${u.se_id ?? "nose"}`}
                      className="unpaid-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-all"
                    >
                      <div>
                        <p className="font-medium">
                          {u.program_id
                            ? u.program_title || `Program ${u.program_id}`
                            : u.skill_id
                            ? skillsMap[u.skill_id]?.title ||
                              `Skill ${u.skill_id}`
                            : u.type === "donation"
                            ? "Donation"
                            : "Other Payment"}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          Saved: {new Date(u.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <a
                          href={`/payment?${
                            u.program_id
                              ? `program=${u.program_id}`
                              : `skill=${u.skill_id}`
                          }${u.se_id ? `&se=${u.se_id}` : ""}`}
                          className="btn-primary"
                          aria-label={`Pay now for ${
                            u.program_id
                              ? u.program_title || `program ${u.program_id}`
                              : u.skill_id
                              ? `skill ${u.skill_id}`
                              : "item"
                          }`}
                        >
                          Pay now
                        </a>
                        <button
                          onClick={async () => {
                            if (!u.se_id || deletingId === u.se_id) return;
                            if (!confirm("Delete this unpaid enrollment?"))
                              return;
                            setDeletingId(u.se_id);
                            try {
                              const res = await fetch(
                                `/api/success-enroll/${u.se_id}/delete`,
                                { method: "DELETE" }
                              );
                              if (res.ok) {
                                setUnpaid((prev) =>
                                  prev.filter((x) => x.se_id !== u.se_id)
                                );
                              }
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          className="btn-outline border-red-200 text-red-600 hover:bg-red-50"
                          aria-label={`Delete unpaid enrollment ${u.se_id}`}
                          disabled={deletingId === u.se_id}
                        >
                          {deletingId === u.se_id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </div>
      </div>

      {(showProfileModal ||
        (!loading && profile && !profile.whatsapp_number)) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (profile?.whatsapp_number) setShowProfileModal(false);
            }}
          />
          <div className="relative z-10 w-full max-w-md card">
            <div className="card-body">
              <h3 className="text-lg font-semibold mb-3">Update Profile</h3>
              {!profile?.whatsapp_number && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                  <strong>Action Required:</strong> Please provide a working
                  WhatsApp number to continue using the dashboard.
                </div>
              )}
              <ProfileUpdateForm
                initial={profile || {}}
                onUpdated={(p) => {
                  setProfile(p);
                  setShowProfileModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ProfileUpdateForm({
  initial,
  onUpdated,
}: {
  initial: {
    full_name?: string;
    phone?: string;
    whatsapp_number?: string;
    country?: string;
    email?: string;
    updated_at?: string;
  };
  onUpdated: (p: any) => void;
}) {
  const [fullName, setFullName] = useState(initial.full_name || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [whatsappNumber, setWhatsappNumber] = useState(
    initial.whatsapp_number || ""
  );
  const [country, setCountry] = useState(initial.country || "");
  const [email, setEmail] = useState((initial as any).email || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const lastUpdated = initial.updated_at
    ? new Date(initial.updated_at).getTime()
    : 0;
  const canUpdate =
    lastUpdated === 0 || Date.now() - lastUpdated > 30 * 24 * 60 * 60 * 1000;
  const nextAllowed = null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) {
      if (!whatsappNumber) {
        setMsg("WhatsApp number is required.");
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          whatsapp_number: whatsappNumber,
          country,
          email,
        })
        .eq("id", user.id);
      if (error) {
        setMsg(error.message);
      } else {
        setMsg("Saved");
        // Re-fetch updated profile and notify parent
        const { data: p2 } = await supabase
          .from("profiles")
          .select(
            "full_name, phone, whatsapp_number, country, dark_mode, months_remaining, role, updated_at"
          )
          .eq("id", user.id)
          .single();
        onUpdated(p2 || {});
      }
    }
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-3">
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full Name"
        className="input"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        className="input"
      />
      <input
        value={whatsappNumber}
        onChange={(e) => setWhatsappNumber(e.target.value)}
        placeholder="WhatsApp Number (Required)"
        className={`input ${
          !whatsappNumber ? "border-amber-400 focus:border-amber-500" : ""
        }`}
        required
      />
      <input
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        placeholder="Country"
        className="input"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="input"
      />
      <button disabled={saving} className="btn-primary">
        {saving ? "Saving…" : "Save Profile"}
      </button>
      {msg && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{msg}</p>
      )}
    </form>
  );
}
