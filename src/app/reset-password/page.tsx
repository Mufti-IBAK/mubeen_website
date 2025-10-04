"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setMsg("Passwords do not match"); return; }
    setSaving(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg(error.message);
    } else {
      setMsg("Password updated. Redirecting to sign-in in 5 seconds...");
      setTimeout(async () => {
        try { await supabase.auth.signOut(); } catch {}
        window.location.href = '/login';
      }, 5000);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 bg-[hsl(var(--background))]">
      <div className="card w-full max-w-md">
        <div className="card-body">
          <h1 className="text-2xl font-bold mb-4 text-center">Reset Password</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">New password</label>
              <div className="relative">
                <input type={show1 ? 'text' : 'password'} className="input pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShow1(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">{show1 ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Confirm password</label>
              <div className="relative">
                <input type={show2 ? 'text' : 'password'} className="input pr-10" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                <button type="button" onClick={() => setShow2(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">{show2 ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <button disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Update password'}</button>
          </form>
          {msg && <p className="mt-3 text-center text-sm text-[hsl(var(--muted-foreground))]">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
