"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export const AdminGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // no-op
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const role = (data as { role?: string } | null)?.role;
      setAllowed(role === "admin" || role === "super_admin");
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="bg-brand-bg min-h-screen flex items-center justify-center"><p>Checking admin access...</p></div>
    );
  }

  if (!allowed) {
    return (
      <div className="bg-brand-bg min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h3 className="text-2xl font-bold text-brand-dark font-heading mb-2">Admin access required</h3>
          <p className="text-brand-dark/70 mb-4">You must be an admin to view this page.</p>
          <Link href="/dashboard"><button className="rounded bg-brand-primary px-6 py-3 text-white font-semibold">Go to Dashboard</button></Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

