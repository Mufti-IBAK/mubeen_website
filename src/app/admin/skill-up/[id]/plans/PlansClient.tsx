"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function PlansClient({ skillId }: { skillId: number }) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  // Single plan approach for skills (simple price)
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("NGN");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("skill_plans")
        .select("price, currency")
        .eq("skill_id", skillId)
        .maybeSingle();
      
      if (data) {
        setPrice(String(data.price));
        setCurrency(data.currency || "NGN");
      }
      setLoading(false);
    })();
  }, [skillId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;

      const res = await fetch(`/api/admin/skills/${skillId}/plans/update`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          price: Number(price),
          currency,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed");
      setMessage("Price updated successfully!");
    } catch (err: any) {
      setMessage(err?.message || "Failed to save");
    }
  };

  if (loading) return <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">Loading pricing...</div>;

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-body">
          <h2 className="text-xl font-bold mb-1">Pricing Configuration</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Set the enrollment fee for this skill.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={save} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <input
                type="number"
                className="input"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select
                className="input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="NGN">NGN (Naira)</option>
                <option value="USD">USD (Dollar)</option>
                <option value="GBP">GBP (Pounds)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center gap-4">
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
              {message && (
                <span className={message.includes("Failed") ? "text-red-600" : "text-green-600"}>
                  {message}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
