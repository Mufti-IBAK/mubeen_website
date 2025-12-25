"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  FaSearch,
  FaFilter,
  FaDownload,
  FaEye,
  FaSync,
  FaExclamationCircle,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";
import { gsap } from "gsap";

type Enrollment = {
  id: number;
  user_id: string | null;
  user_name: string;
  user_email: string;
  program_title: string;
  amount: number | null;
  currency: string | null;
  status: string;
  payment_status: string;
  created_at: string;
  profiles?: { full_name: string; email: string; phone: string };
};

export default function MasterRegistryPage() {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [programs, setPrograms] = useState<{id: number, title: string}[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      const params = new URLSearchParams({
        page: page.toString(),
        status: statusFilter,
        program: programFilter,
        q: searchQuery,
      });

      const res = await fetch(
        `/api/admin/enrollments/registry?${params.toString()}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setItems(json.items || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, programFilter, searchQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Fetch programs for filter
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data } = await supabase.from('programs').select('id, title').order('title');
        if (data) setPrograms(data);
      } catch (e) {
        console.error('Failed to fetch programs:', e);
      }
    };
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (!loading && items.length > 0) {
      const rows = tableRef.current?.querySelectorAll("tbody tr");
      if (rows) {
        gsap.fromTo(
          rows,
          { opacity: 0, y: 5 },
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: "power2.out" }
        );
      }
    }
  }, [loading, items]);

  const getStatusBadge = (item: Enrollment) => {
    if (item.status === "cancelled")
      return (
        <span className="badge badge-error gap-1">
          <FaExclamationCircle /> Cancelled
        </span>
      );
    if (item.payment_status?.toLowerCase() === "paid")
      return (
        <span className="badge badge-success gap-1">
          <FaCheckCircle /> Paid
        </span>
      );
    return (
      <span className="badge badge-warning gap-1">
        <FaClock /> Pending
      </span>
    );
  };

  const exportCSV = () => {
    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Program",
      "Amount",
      "Status",
      "Date",
    ];
    const rows = items.map((i) => [
      i.id,
      i.profiles?.full_name || i.user_name,
      i.profiles?.email || i.user_email,
      i.profiles?.phone || "N/A",
      i.program_title,
      `${i.currency || "NGN"} ${i.amount || 0}`,
      i.payment_status?.toLowerCase() === "paid"
        ? "Paid"
        : i.status === "cancelled"
        ? "Cancelled"
        : "Pending",
      new Date(i.created_at).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute(
      "download",
      `mubeen_registry_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-brand-dark to-sky-700 bg-clip-text text-transparent">
            Enrollment Registry
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">
            Unified view of all registrations, payments, and student records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="btn-outline flex items-center gap-2"
          >
            <FaDownload size={14} /> Export CSV
          </button>
          <button
            onClick={() => {
              setPage(1);
              fetchItems();
            }}
            className="btn-primary flex items-center gap-2"
          >
            <FaSync size={14} className={loading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>
      </header>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-[hsl(var(--card))] p-4 rounded-xl border border-[hsl(var(--border))] shadow-sm">
        <div className="relative col-span-1 md:col-span-2">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="input pl-10 w-full"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="relative">
          <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <select
            className="input pl-10 w-full appearance-none"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid & Active</option>
            <option value="pending">Pending Payment</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="relative">
          <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <select
            className="input pl-10 w-full appearance-none"
            value={programFilter}
            onChange={(e) => {
              setProgramFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Programs</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-end text-sm text-[hsl(var(--muted-foreground))]">
          Showing {items.length} of {total} records
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center p-20 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-[hsl(var(--card))] rounded-xl border border-dashed border-[hsl(var(--border))]">
          <FaSearch className="mx-auto text-4xl text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold">No records found</h3>
          <p className="text-[hsl(var(--muted-foreground))]">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div
          className="card shadow-sm border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]"
          ref={tableRef}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                  <th className="px-6 py-4 font-bold">ID</th>
                  <th className="px-6 py-4 font-bold">Student</th>
                  <th className="px-6 py-4 font-bold">Program</th>
                  <th className="px-6 py-4 font-bold">Amount</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-sky-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sky-800">
                        {item.profiles?.full_name || item.user_name}
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        {item.profiles?.email || item.user_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {item.program_title}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">
                        {item.currency || "NGN"}{" "}
                        {Number(item.amount || 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(item)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/enrollments/user/${
                          item.user_id || encodeURIComponent(item.user_email)
                        }`}
                        className="btn-outline !py-1 !px-2 flex items-center gap-1 inline-flex"
                      >
                        <FaEye size={12} /> Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="btn-outline px-4 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <div className="flex items-center gap-1 font-medium px-4 h-10 bg-[hsl(var(--muted))] rounded-lg">
            Page {page} of {totalPages}
          </div>
          <button
            disabled={page === totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="btn-outline px-4 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
