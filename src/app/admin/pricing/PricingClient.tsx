"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PricingItem = {
  entity_type: "program" | "skill";
  entity_id: number;
  title: string;
  price_id?: number;
  price: string; // string for input
  currency: string;
};

export function PricingClient() {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    // Fetch all programs
    const { data: progs } = await supabase
      .from("programs")
      .select("id, title")
      .order("title");
    // Fetch all skills
    const { data: skills } = await supabase
      .from("skills")
      .select("id, title")
      .order("title");
    // Fetch all unified prices
    const { data: prices } = await supabase.from("pricing_plans").select("*");

    const priceMap = new Map<string, any>();
    (prices || []).forEach((p: any) => {
      priceMap.set(`${p.entity_type}_${p.entity_id}`, p);
    });

    const combined: PricingItem[] = [];
    (progs || []).forEach((p: any) => {
      const pr = priceMap.get(`program_${p.id}`);
      combined.push({
        entity_type: "program",
        entity_id: p.id,
        title: p.title,
        price_id: pr?.id,
        price: pr ? String(pr.price) : "",
        currency: pr?.currency || "NGN",
      });
    });
    (skills || []).forEach((s: any) => {
      const pr = priceMap.get(`skill_${s.id}`);
      combined.push({
        entity_type: "skill",
        entity_id: s.id,
        title: s.title,
        price_id: pr?.id,
        price: pr ? String(pr.price) : "",
        currency: pr?.currency || "NGN",
      });
    });

    setItems(combined);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const savePrice = async (item: PricingItem) => {
    setUpdatingId(item.entity_id);
    setMessage("");

    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;

      // We'll use a direct Upsert call using the unique constraint
      // But RLS might require using a server-side API or proper setup.
      // For now, let's use a server action/API route to handle the upsert properly
      // OR try direct upsert if RLS allows.
      // To be safe and consistent with other editors, we'll assume we can use the `plans/update` APIs or a new global API.
      // Let's create a new global API for this: /api/admin/pricing/update

      const payload = {
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        price: Number(item.price),
        currency: item.currency,
        subscription_type: "monthly", // Default for now
      };

      const res = await fetch("/api/admin/pricing/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");

      // Refresh local data to get the new ID if needed, or just show success
      // We can update the price_id in local state if we want strict consistency
      setMessage(`Saved ${item.title}`);
      setTimeout(() => setMessage(""), 3000);
    } catch (e: any) {
      alert(`Error saving ${item.title}: ${e.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePriceChange = (index: number, val: string) => {
    const next = [...items];
    next[index].price = val;
    setItems(next);
  };

  const handleCurrencyChange = (index: number, val: string) => {
    const next = [...items];
    next[index].currency = val;
    setItems(next);
  };

  if (loading) return <div>Loading Global Pricing...</div>;

  return (
    <div className="card">
      <div className="card-body overflow-x-auto">
        {message && (
          <div className="p-3 bg-green-100 text-green-700 rounded mb-4">
            {message}
          </div>
        )}
        <table className="table-auto w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-2">Type</th>
              <th className="p-2">Title</th>
              <th className="p-2">Price</th>
              <th className="p-2">Currency</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr
                key={`${item.entity_type}-${item.entity_id}`}
                className="border-b hover:bg-muted/50"
              >
                <td className="p-2">
                  <span
                    className={`badge ${
                      item.entity_type === "program"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {item.entity_type}
                  </span>
                </td>
                <td className="p-2 font-medium">{item.title}</td>
                <td className="p-2">
                  <input
                    type="number"
                    className="input w-32"
                    placeholder="0.00"
                    value={item.price}
                    onChange={(e) => handlePriceChange(idx, e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <select
                    className="input w-24"
                    value={item.currency}
                    onChange={(e) => handleCurrencyChange(idx, e.target.value)}
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => savePrice(item)}
                    disabled={updatingId === item.entity_id}
                    className="btn-primary text-xs py-1 px-3"
                  >
                    {updatingId === item.entity_id ? "Saving..." : "Save"}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center">
                  No programs or skills found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
