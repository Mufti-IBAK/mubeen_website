"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/use-toast";
import { ensureAbsoluteUrl } from "@/lib/utils";

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
  expires_at: string | null;
  classroom_link?: string | null;
  classroom_enabled?: boolean | null;
  defer_active?: boolean | null;
  completed_at?: string | null;
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
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [successPayments, setSuccessPayments] = useState<
    Array<{
      id: number;
      program_id: number | null;
      skill_id: number | null;
      program_title: string | null;
      amount: number | null;
      currency: string | null;
      created_at: string;
      type: string;
      status: string;
      payment_status?: string | null;
      description?: string | null;
      category?: string | null;
      subscription_type?: string | null;
      expires_at?: string | null;
    }>
  >([]);
  const [programs, setPrograms] = useState<Record<number, Program>>({});
  const [skills, setSkills] = useState<
    Record<number, { id: number; title: string; slug?: string }>
  >({});
  const [plans, setPlans] = useState<Record<number, Plan>>({});
  const [classLinks, setClassLinks] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user?.email) setUserEmail(user.email);
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: enr } = await supabase
      .from("enrollments")
      .select(
        "id, program_id, skill_id, user_id, status, payment_status, created_at, plan_id, amount, currency, description, subscription_type, expires_at"
      )
      .or(`user_id.eq.${user.id},user_email.eq.${user.email ?? ""}`)
      .order("created_at", { ascending: false });

    const list = (enr as any[]) || [];
    setSuccessPayments(list);

    const pids = Array.from(
      new Set(list.map((e) => e.program_id).filter(Boolean))
    );
    if (pids.length) {
      const { data: progs } = await supabase
        .from("programs")
        .select(
          "id,title,slug,image_url,duration,start_date,language,level,overview,schedule,instructors"
        )
        .in("id", pids);
      const pm: Record<number, Program> = {};
      (progs as Program[] | null)?.forEach((p) => {
        pm[p.id] = p;
      });
      setPrograms(pm);
    }

    const skillIds = Array.from(
      new Set(list.map((e) => e.skill_id).filter(Boolean))
    );
    if (skillIds.length > 0) {
      const { data: sk } = await supabase
        .from("skills")
        .select("id, title, slug")
        .in("id", skillIds);
      const sm: Record<number, { id: number; title: string; slug?: string }> =
        {};
      ((sk as any[]) || []).forEach((s) => {
        sm[s.id] = s;
      });
      setSkills(sm);
    }

    // Fetch classroom links for paid enrollments
    const paidIds = list
      .filter((r) => r.payment_status === "paid" || r.status === "active")
      .map((r) => r.id);
    if (paidIds.length > 0) {
      const { data: linksData } = await supabase
        .from("class_links")
        .select("enrollment_id, classroom_link")
        .in("enrollment_id", paidIds);

      if (linksData) {
        const linksMap: Record<number, string> = {};
        linksData.forEach(
          (link: { enrollment_id: number; classroom_link: string }) => {
            linksMap[link.enrollment_id] = link.classroom_link;
          }
        );
        setClassLinks(linksMap);
      }
    }

    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

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
    const price = e.amount ?? plan?.price ?? 0;
    const currency = e.currency || plan?.currency || "NGN";
    if (!price) {
      return toast({
        title: "Payment error",
        description: "No price available for this enrollment.",
        variant: "destructive",
      });
    }

    // Get current user email for customer info
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user?.email) {
      return toast({
        title: "Authentication required",
        description: "Please log in to continue with payment.",
        variant: "destructive",
      });
    }

    try {
      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
        tx_ref: String(e.id),
        amount: price,
        currency,
        redirect_url: `/payment-success?ref=${e.id}`,
        customer: {
          email: user.email,
          name: user.email.split("@")[0] || "Student",
        },
        customizations: {
          title: "Mubeen Academy",
          description: `Payment for ${p?.title || "Program"}`,
          logo: "/logo.png",
        },
      });
    } catch {
      toast({
        title: "Payment error",
        description: "Unable to initiate payment. Please try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-6 py-24">
      <div className="container-page space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Registrations</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Manage your program enrollments and access learning materials
            </p>
          </div>
          <button onClick={() => load()} className="btn-outline">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* My Enrollments from success_enroll */}
            {successPayments.length > 0 && (
              <section aria-labelledby="my-enrollments-heading">
                <h2
                  id="my-enrollments-heading"
                  className="text-xl font-semibold mb-4"
                >
                  My Enrollments
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {successPayments.map((r) => (
                    <article
                      key={r.id}
                      className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          {r.program_title ||
                            (r.program_id
                              ? `Program ${r.program_id}`
                              : r.skill_id
                              ? skills[r.skill_id]?.title ||
                                `Skill ${r.skill_id}`
                              : r.type)}
                        </h3>
                        <span
                          className={`badge text-xs ${
                            r.payment_status === "paid" ||
                            r.status === "paid" ||
                            r.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {r.payment_status === "paid" ||
                          r.status === "paid" ||
                          r.status === "active"
                            ? "Paid"
                            : "Pending Payment"}
                        </span>
                      </div>
                      <div className="text-sm">
                        {/* Category removed in unified model */}
                        <p>
                          <span className="text-[hsl(var(--muted-foreground))] mr-1">
                            Amount:
                          </span>
                          {r.currency || "NGN"}{" "}
                          {Number(r.amount || 0).toLocaleString()}
                          {r.subscription_type &&
                            r.subscription_type !== "once" && (
                              <span className="text-[hsl(var(--muted-foreground))] ml-1">
                                /{" "}
                                {r.subscription_type === "monthly"
                                  ? "monthly"
                                  : r.subscription_type === "yearly"
                                  ? "yearly"
                                  : r.subscription_type === "weekly"
                                  ? "weekly"
                                  : r.subscription_type === "class"
                                  ? "class"
                                  : r.subscription_type}
                              </span>
                            )}
                        </p>
                        <p className="text-[hsl(var(--muted-foreground))]">
                          {new Date(r.created_at).toLocaleString()}
                        </p>
                        {r.expires_at && (
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block">
                            Expires:{" "}
                            {new Date(r.expires_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(r.status === "pending" ||
                          r.payment_status === "unpaid") && (
                          <a
                            href={`/payment?${
                              r.skill_id
                                ? `skill=${r.skill_id}`
                                : `program=${r.program_id}`
                            }${r.id ? `&enrollment_id=${r.id}` : ""}`}
                            className="btn-primary flex-1 text-center"
                          >
                            Pay Now
                          </a>
                        )}
                        {/* Renew Button (for non-one-time, paid subscriptions) */}
                        {(r.payment_status === "paid" ||
                          r.status === "paid" ||
                          r.status === "active") &&
                          r.subscription_type &&
                          r.subscription_type !== "once" && (
                            <Link
                              href={`/dashboard/renew/${r.id}`}
                              className="btn-outline flex-1 text-center py-2"
                            >
                              Renew
                            </Link>
                          )}
                        {/* Join Classroom Button (only if paid) */}
                        {(r.payment_status === "paid" ||
                          r.status === "paid" ||
                          r.status === "active") &&
                          classLinks[r.id] && (
                            <a
                              href={ensureAbsoluteUrl(classLinks[r.id])}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary flex-1 text-center"
                              aria-label={`Join classroom for ${
                                r.program_title || r.description || r.type
                              }`}
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
                  <p className="text-[hsl(var(--muted-foreground))] mb-4">
                    You haven’t enrolled in any programs yet
                  </p>
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
