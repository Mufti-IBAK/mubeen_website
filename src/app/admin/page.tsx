"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaBook, FaFileAlt, FaUsers } from "react-icons/fa";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function AdminHomePage() {
  const [users, setUsers] = useState<number | null>(null);
  const [programs, setPrograms] = useState<number | null>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      const { count: progCount } = await supabase
        .from("programs")
        .select("id", { count: "exact", head: true });

      // Fetch stats from view
      const { data: analytics } = await supabase
        .from("analytics_program_registrations")
        .select("*")
        .limit(5);

      // Fetch activity data (registrations by month)
      const { data: activity } = await supabase.rpc(
        "get_monthly_registrations"
      ); // Assuming RPC or we process client side if small
      // Fallback client-side aggregation if RPC missing (safer for now)
      const { data: regs } = await supabase
        .from("enrollments")
        .select("created_at")
        .order("created_at", { ascending: true });

      const chartData: any[] = [];
      if (regs) {
        const map = new Map<string, number>();
        regs.forEach((r: any) => {
          const month = new Date(r.created_at).toLocaleString("default", {
            month: "short",
          });
          map.set(month, (map.get(month) || 0) + 1);
        });
        // Last 6 months order? simple map iteration for now
        map.forEach((count, month) =>
          chartData.push({ name: month, users: count })
        );
      }

      setUsers(usersCount || 0);
      setPrograms(progCount || 0);
      setStats(analytics || []);
      setActivityData(
        chartData.length ? chartData : [{ name: "No Data", users: 0 }]
      );
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white dark:bg-[#0d1528] border border-gray-200 dark:border-white/10 p-5">
            <p className="text-xs uppercase tracking-wide text-brand-dark/60 dark:text-white/60">
              Total Users
            </p>
            <p className="mt-2 text-3xl font-extrabold text-brand-dark dark:text-white">
              {users ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-white dark:bg-[#0d1528] border border-gray-200 dark:border-white/10 p-5">
            <p className="text-xs uppercase tracking-wide text-brand-dark/60 dark:text-white/60">
              Programs
            </p>
            <p className="mt-2 text-3xl font-extrabold text-brand-dark dark:text-white">
              {programs ?? "—"}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/admin/registrations"
            className="card hover:border-[hsl(var(--primary))] transition-colors hover:shadow-elevated hover-lift"
          >
            <div className="card-body flex items-start gap-3">
              <FaFileAlt className="text-[hsl(var(--primary))] mt-1" />
              <div>
                <p className="font-semibold">Registrations</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  View program registrations
                </p>
              </div>
            </div>
          </a>
          <a
            href="/admin/programs"
            className="card hover:border-[hsl(var(--primary))] transition-colors hover:shadow-elevated hover-lift"
          >
            <div className="card-body flex items-start gap-3">
              <FaBook className="text-[hsl(var(--primary))] mt-1" />
              <div>
                <p className="font-semibold">Programs</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Create, edit, and organize programs
                </p>
              </div>
            </div>
          </a>
          <a
            href="/admin/resources"
            className="card hover:border-[hsl(var(--primary))] transition-colors hover:shadow-elevated hover-lift"
          >
            <div className="card-body flex items-start gap-3">
              <FaFileAlt className="text-[hsl(var(--primary))] mt-1" />
              <div>
                <p className="font-semibold">Resources</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Upload and manage downloadable files
                </p>
              </div>
            </div>
          </a>
          <a
            href="/admin/user-management"
            className="card hover:border-[hsl(var(--primary))] transition-colors hover:shadow-elevated hover-lift"
          >
            <div className="card-body flex items-start gap-3">
              <FaUsers className="text-[hsl(var(--primary))] mt-1" />
              <div>
                <p className="font-semibold">User Management</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Assign roles and update profiles
                </p>
              </div>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
