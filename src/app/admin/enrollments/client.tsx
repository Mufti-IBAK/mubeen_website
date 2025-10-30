"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { FiUsers, FiUser, FiEye } from "react-icons/fi";

interface Enrollment {
  id: number;
  user_id: string;
  program_id: number;
  status: string | null;
  payment_status: string | null;
  amount: number | null;
  currency: string | null;
  transaction_id: string | null;
  form_data: Record<string, unknown> | null;
  classroom_link: string | null;
  defer_active?: boolean | null;
  completed_at?: string | null;
  created_at: string;
  is_family?: boolean | null;
  family_size?: number | null;
}

interface Program {
  id: number;
  title: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function EnrollmentsClient() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState<number | "all">("all");
  const [filterPayment, setFilterPayment] = useState<"all" | "paid" | "unpaid">("all");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "incomplete" | "complete">("all");

  const load = async () => {
    setLoading(true);
    // Fetch programs for filters
    const { data: progs } = await supabase.from("programs").select("id, title").order("title");
    const programs = (progs as Program[]) || [];
    setPrograms(programs);

    // Fetch all enrollments via secure endpoint
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch("/api/admin/enrollments/all", {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (res.ok) {
      const json = await res.json();
      const items: Enrollment[] = (json.items || []) as Enrollment[];
      setEnrollments(items);
      setProfiles(json.profiles || {});
    } else {
      setEnrollments([]);
      setProfiles({});
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      if (filterProgram !== "all" && e.program_id !== filterProgram) return false;
      if (filterPayment !== "all" && (e.payment_status || "unpaid") !== filterPayment) return false;
      if (filterStatus === "incomplete" && (e.payment_status === "paid" && e.form_data)) return false;
      if (filterStatus === "complete" && (e.payment_status !== "paid" || !e.form_data)) return false;

      const p = profiles[e.user_id];
      const name = (p?.full_name || "").toLowerCase();
      const email = (p?.email || "").toLowerCase();
      const q = search.toLowerCase();
      if (!q) return true;
      return name.includes(q) || email.includes(q);
    });
  }, [enrollments, filterProgram, filterPayment, profiles, search, filterStatus]);

  const programTitle = (id: number) => programs.find((p) => p.id === id)?.title || `Program ${id}`;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="input"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search enrollments by name or email"
          />
          <select
            className="input"
            aria-label="Filter by program"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">All programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <select
            className="input"
            aria-label="Filter by payment status"
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value as "all" | "paid" | "unpaid")}
          >
            <option value="all">All payment</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <select
            className="input"
            aria-label="Filter by completion status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "incomplete" | "complete")}
          >
            <option value="all">All status</option>
            <option value="incomplete">Incomplete</option>
            <option value="complete">Complete</option>
          </select>
          <button className="btn-outline" onClick={load} aria-label="Refresh enrollments">
            Refresh
          </button>
        </div>
      </div>

      {/* Enrollment Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-[hsl(var(--muted-foreground))]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center text-[hsl(var(--muted-foreground))]">No enrollments found.</div>
        ) : (
          filtered.map((e) => {
            const profile = profiles[e.user_id];
            const isFamily = e.is_family;
            const isComplete = e.payment_status === "paid" && e.form_data;

            return (
              <div
                key={e.id}
                className={`rounded-xl border shadow-sm p-4 flex flex-col gap-3 ${
                  isFamily
                    ? "border-blue-200 bg-blue-50/30"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isFamily ? (
                        <FiUsers className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      ) : (
                        <FiUser className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      )}
                      <h3 className="font-semibold">{profile?.full_name || profile?.email || "Unknown User"}</h3>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] ml-6">{profile?.email || "—"}</p>
                    {isFamily && (
                      <p className="text-xs text-blue-600 ml-6 mt-1">Family Head - {e.family_size} members</p>
                    )}
                  </div>
                  <span
                    className={`badge ${
                      e.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {e.payment_status || "unpaid"}
                  </span>
                </div>

                {/* Details */}
                <div className="text-sm space-y-1 pb-3 border-b border-[hsl(var(--border))]">
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Program:</span>
                    <span className="font-medium">{programTitle(e.program_id)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Amount:</span>
                    <span className="font-medium">{e.currency || "NGN"} {e.amount ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Status:</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      isComplete ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {isComplete ? "Complete" : "Incomplete"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--muted-foreground))]">Enrolled:</span>
                    <span className="font-medium text-xs">{new Date(e.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Category Badge */}
                <div>
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                    {isFamily ? `Family of ${e.family_size || "?"}` : "Individual"}
                  </span>
                </div>

                {/* Action Button */}
                <Link
                  href={`/admin/enrollments/${e.id}`}
                  className="btn-primary flex items-center justify-center gap-2 mt-2"
                  aria-label={`View enrollment details for ${profile?.full_name || "user"}`}
                >
                  <FiEye className="h-4 w-4" />
                  View Details
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
