"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const run = async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) throw error;
        // After session is established, update profile with user metadata if present
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (user) {
          const meta: Record<string, unknown> = user.user_metadata || {} as Record<string, unknown>;
          const full_name = (meta['full_name'] as string) || null;
          const phone = (meta['phone'] as string) || null;
          const country = (meta['country'] as string) || null;
          if (full_name || phone || country) {
            await supabase.from('profiles').update({ full_name, phone, country }).eq('id', user.id);
          }
        }
        // Redirect by role if admin
        let dest = "/dashboard";
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if ((prof as { role?: string } | null)?.role === 'admin') dest = "/admin";
        }
        setMessage("Email verified! Redirecting...");
        setTimeout(() => { window.location.href = dest; }, 1000);
      } catch (_err) {
        setMessage("Verification complete. Redirecting...");
        setTimeout(() => { window.location.href = "/dashboard"; }, 1200);
      }
    };
    run();
  }, []);

  return (
    <div className="bg-brand-bg min-h-screen flex items-center justify-center px-6">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md">
        <h1 className="text-2xl font-bold text-brand-dark font-heading mb-2">Account Verification</h1>
        <p className="text-brand-dark/70">{message}</p>
      </div>
    </div>
  );
}

