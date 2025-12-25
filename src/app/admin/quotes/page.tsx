"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaPlus, FaTrash, FaEdit, FaQuoteRight } from "react-icons/fa";
import { gsap } from "gsap";

type Quote = {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
};

export default function AdminQuotesPage() {
  const [items, setItems] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Quote> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Quote[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!loading && items.length > 0) {
      const cards = containerRef.current?.querySelectorAll(".item-row");
      if (cards) {
        gsap.fromTo(cards, 
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }
        );
      }
    }
  }, [loading, items]);

  const remove = async (id: number) => {
    if (!confirm("Delete this quote?")) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) {
      alert(error.message);
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.author_name || !editing?.content) return;
    setSaving(true);

    try {
      if (editing.id) {
        const { error } = await supabase
          .from("quotes")
          .update({
            author_name: editing.author_name,
            content: editing.content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("quotes").insert([
          {
            author_name: editing.author_name,
            content: editing.content,
          },
        ]);
        if (error) throw error;
      }
      setShowModal(false);
      setEditing(null);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" ref={containerRef}>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2 tracking-tight">
            <FaQuoteRight className="text-emerald-500 scale-75" />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Wisdom Quotes
            </span>
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Inspirational words from scholars and thinkers for the homepage.</p>
        </div>
        <button 
          onClick={() => { setEditing({ author_name: "", content: "" }); setShowModal(true); }}
          className="btn-primary flex items-center gap-2 !bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700"
        >
          <FaPlus size={14} /> Add Quote
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-20 bg-[hsl(var(--card))] border-dashed border-emerald-200">
          <div className="card-body">
            <FaQuoteRight className="mx-auto text-4xl text-emerald-100 mb-4" />
            <h3 className="text-lg font-semibold">No quotes found</h3>
            <p className="text-[hsl(var(--muted-foreground))]">Add quotes from classical scholars or inspiring thinkers.</p>
          </div>
        </div>
      ) : (
        <div className="card shadow-md overflow-hidden bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-semibold">
                <tr>
                  <th className="px-6 py-4">Scholar/Author</th>
                  <th className="px-6 py-4 w-2/3">Quote Content</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {items.map((item) => (
                  <tr key={item.id} className="item-row hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-emerald-700">{item.author_name}</td>
                    <td className="px-6 py-4 line-clamp-2 md:line-clamp-none italic font-medium">&quot;{item.content}&quot;</td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button 
                        onClick={() => { setEditing(item); setShowModal(true); }}
                        className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <FaEdit size={16} />
                      </button>
                      <button 
                        onClick={() => remove(item.id)}
                        className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FaTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-full max-w-lg card animate-in zoom-in-95 duration-200 bg-[hsl(var(--card))] border shadow-2xl">
            <div className="card-body">
              <h2 className="text-xl font-bold mb-6 text-emerald-800">
                {editing?.id ? "Edit Quote" : "New Wisdom Quote"}
              </h2>
              <form onSubmit={save} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Author Name *</label>
                  <input
                    required
                    className="input w-full focus:ring-emerald-500"
                    value={editing?.author_name || ""}
                    onChange={(e) => setEditing({ ...editing, author_name: e.target.value })}
                    placeholder="e.g. Imam Ash-Shafi'i"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quote *</label>
                  <textarea
                    required
                    className="textarea w-full h-32 focus:ring-emerald-500"
                    value={editing?.content || ""}
                    onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                    placeholder="Enter the wise words here..."
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="btn-outline"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary !bg-emerald-600 !border-emerald-600 hover:!bg-emerald-700"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : editing?.id ? "Update Quote" : "Create Quote"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
