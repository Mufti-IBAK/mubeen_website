"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaBook, FaFileAlt, FaUsers } from "react-icons/fa";

export default function AdminHomePage() {
  const [users, setUsers] = useState<number | null>(null);
  const [programs, setPrograms] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const { count: usersCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      const { count: progCount } = await supabase.from('programs').select('id', { count: 'exact', head: true });
      setUsers(usersCount || 0);
      setPrograms(progCount || 0);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white dark:bg-[#0d1528] border border-gray-200 dark:border-white/10 p-5">
            <p className="text-xs uppercase tracking-wide text-brand-dark/60 dark:text-white/60">Total Users</p>
            <p className="mt-2 text-3xl font-extrabold text-brand-dark dark:text-white">{users ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-[#0d1528] border border-gray-200 dark:border-white/10 p-5">
            <p className="text-xs uppercase tracking-wide text-brand-dark/60 dark:text-white/60">Programs</p>
            <p className="mt-2 text-3xl font-extrabold text-brand-dark dark:text-white">{programs ?? '—'}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a href="/admin/registrations" className="card hover:border-[hsl(var(--primary))] transition-colors hover:shadow-elevated hover-lift">
            <div className="card-body flex items-start gap-3">
              <FaFileAlt className="text-[hsl(var(--primary))] mt-1" />
              <div>
                <p className="font-semibold">Registrations</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">View program registrations</p>
              </div>
            </div>
          </a>
          <a href="/admin/programs" className="card hover:border-[hsl(var(--primary))] transition-colors hover:shadow-elevated hover-lift">
            <div className="card-body flex items-start gap-3">
              <FaBook className="text-[hsl(var(--primary))] mt-1" />
              <div>
                <p className="font-semibold">Programs</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Create, edit, and organize programs</p>
              </div>
            </div>
          </a>
          <a href="/admin/resources" className="card hover:border-[hsl(var(--primary))] transition-colors hover:shadow-elevated hover-lift">
            <div className="card-body flex items-start gap-3">
              <FaFileAlt className="text-[hsl(var(--primary))] mt-1" />
              <div>
                <p className="font-semibold">Resources</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Upload and manage downloadable files</p>
              </div>
            </div>
          </a>
          <a href="/admin/user-management" className="card hover:border-[hsl(var(--primary))] transition-colors hover:shadow-elevated hover-lift">
            <div className="card-body flex items-start gap-3">
              <FaUsers className="text-[hsl(var(--primary))] mt-1" />
              <div>
                <p className="font-semibold">User Management</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Assign roles and update profiles</p>
              </div>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}

