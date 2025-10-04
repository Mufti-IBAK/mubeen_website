"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!ignore) {
        setIsAuthed(!!data.session);
        setLoading(false);
      }
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_event: unknown, session: unknown) => {
      setIsAuthed(!!session);
    });
    return () => {
      ignore = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-xl mx-auto text-center">
        <p className="text-brand-dark/70">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-xl mx-auto text-center">
        <h3 className="text-2xl font-bold text-brand-dark font-heading mb-3">Please log in to continue</h3>
        <p className="text-brand-dark/70 mb-6">You need an account to register for courses.</p>
        <Link href="/login">
          <button className="rounded-md bg-brand-primary px-6 py-3 text-white font-semibold">Go to Login</button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

