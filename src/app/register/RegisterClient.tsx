"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DynamicRegistrationFlow } from "@/components/DynamicRegistrationFlow";

export default function RegisterClient({ programSlug }: { programSlug?: string }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        console.log('Client-side auth check:', !!data.user);
        if (!data.user) {
          console.log('No user found on client, redirecting to login');
          window.location.href = `/login?next=${encodeURIComponent(`/programs/${programSlug || ''}/register`)}}`;
          return;
        }
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = `/login?next=${encodeURIComponent(`/programs/${programSlug || ''}/register`)}}`;
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [programSlug]);

  if (authLoading) {
    return (
      <div className="text-center">
        <p className="text-[hsl(var(--muted-foreground))]">Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center">
        <p className="text-[hsl(var(--muted-foreground))]">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <DynamicRegistrationFlow programSlug={programSlug} />
  );
}
