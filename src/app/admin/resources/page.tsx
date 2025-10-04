"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AdminResourcesListPage() {
  const [items, setItems] = useState<Array<{ id: number; title: string; file_url: string; category?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("resources").select("id, title, file_url, category").order("id", { ascending: false });
      setItems((data as any[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const remove = async (id: number) => {
    if (!confirm("Delete this resource?")) return;
    await supabase.from("resources").delete().eq("id", id);
    setItems(items.filter(i => i.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand-dark font-heading">Resources</h1>
        <Link href="/admin/resources/new"><button className="rounded-md bg-brand-primary px-4 py-2 text-white font-semibold">New Resource</button></Link>
      </div>
      <div className="card">
        <div className="card-body">
          {loading ? (
          <p className="text-brand-dark/70">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-brand-dark/70">No resources yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-sm text-brand-dark/70">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 pr-4">{r.title}</td>
                    <td className="py-2 pr-4">{r.category || '-'}</td>
                    <td className="py-2 pr-4 space-x-3">
                      <Link href={`/admin/resources/${r.id}`}>Edit</Link>
                      <button onClick={() => remove(r.id)} className="text-red-600">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

