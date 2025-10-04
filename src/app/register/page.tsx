import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import RegisterClient from "./RegisterClient";

export const dynamic = 'force-dynamic';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  const { program } = await searchParams;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  console.log('Register page auth check:', { hasUser: !!data.user, error: error?.message });
  
  // Only redirect if we're certain there's no user AND no error that might indicate a temporary issue
  if (!data.user && !error?.message?.includes('session') && !error?.message?.includes('refresh')) {
    console.log('Redirecting to login because no user found');
    redirect(`/login?next=${encodeURIComponent(`/register?program=${program || ''}`)}`);
  } else if (!data.user && error) {
    console.log('Auth error, but might be session issue:', error.message);
    // Don't redirect immediately for session/token errors, let client-side handle it
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] px-6 py-24">
      <div className="container-page">
        <div className="card max-w-5xl mx-auto">
          <div className="card-body">
            <h1 className="text-2xl font-bold mb-4">Program Registration</h1>
            <RegisterClient programSlug={program} />
          </div>
        </div>
      </div>
    </div>
  );
}

