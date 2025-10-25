"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [mode, setMode] = useState<"login" | "signup">('login');
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Hydration-safe: set mode after mount based on URL
  const [nextDest, setNextDest] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode');
      if (m === 'signup') setMode('signup');
      const n = params.get('next');
      if (n && n.startsWith('/')) setNextDest(n);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Update profile metadata to ensure name/email show everywhere
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (user) {
          const meta: Record<string, unknown> = user.user_metadata || {} as Record<string, unknown>;
          const full_name = (meta['full_name'] as string) || (meta['name'] as string) || null;
          await supabase.from('profiles').update({ email: user.email, full_name }).eq('id', user.id);
        }
        // Decide destination by role
        let dest = "/dashboard";
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          const role = (prof as { role?: string } | null)?.role;
          if (role === 'admin' || role === 'super_admin') dest = "/admin";
        }
        setMessage("Logged in. Redirecting...");
        const to = nextDest || dest;
        window.location.href = to;
      } else {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error('Please enter a valid email address');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { error } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: { 
            data: { full_name: fullName, phone, country }, 
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined 
          } 
        });
        if (error) throw error;
        setMessage("Sign up successful! Please check your email to confirm your account.");
        setMode("login");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[hsl(var(--background))] min-h-screen flex items-center justify-center px-6 py-20">
      <div className="card w-full max-w-md">
        <div className="card-body">
          <h1 className="text-2xl font-bold text-center mb-4">
            {mode === "login" ? "Sign in" : "Create your account"}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm mb-1">Full Name</label>
                  <input id="fullName" name="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm mb-1">Phone</label>
                  <input id="phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm mb-1">Country</label>
                  <input id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} className="input" />
                </div>
              </>
            )}
            <div>
              <label htmlFor="email" className="block text-sm mb-1">Email</label>
              <input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm mb-1">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="input pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm mb-1">Confirm Password</label>
                <input id="confirmPassword" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="input" />
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
          {message && <p className="text-center text-sm mt-4 text-[hsl(var(--muted-foreground))]">{message}</p>}

          <div className="text-center mt-3 text-sm">
            {mode === 'login' && (
              <button className="text-[hsl(var(--primary))]" onClick={async () => {
                if (!email) { setMessage('Enter your email above first'); return; }
                setMessage('Sending reset link...');
                const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined });
                setMessage(error ? error.message : 'Check your email for the password reset link.');
              }}>Forgot password?</button>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined } })}
              className="btn-outline w-full"
            >
              Continue with Google
            </button>
            {mode === 'login' && (
              <button
                type="button"
                onClick={async () => {
                  if (!email) { setMessage('Enter your email above first'); return; }
                  setMessage('Sending magic link...');
                  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined } });
                  setMessage(error ? error.message : 'Check your email for a magic sign-in link.');
                }}
                className="btn-outline w-full"
              >
                Email me a sign-in link
              </button>
            )}
          </div>

          <div className="text-center mt-6 text-sm">
            {mode === "login" ? (
              <button className="text-[hsl(var(--primary))]" onClick={() => setMode("signup")}>Need an account? Create one</button>
            ) : (
              <button className="text-[hsl(var(--primary))]" onClick={() => setMode("login")}>Already have an account? Sign in</button>
            )}
          </div>
          <div className="text-center mt-4">
            <Link href="/">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

