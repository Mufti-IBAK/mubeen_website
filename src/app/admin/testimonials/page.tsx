"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FaPlus, FaTrash, FaEdit, FaQuoteLeft } from "react-icons/fa";
import { gsap } from "gsap";

type Testimonial = {
  id: number;
  author_name: string;
  author_title: string | null;
  content: string;
  created_at: string;
};

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Testimonial> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("testimonials")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Testimonial[]) || []);
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
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }
        );
      }
    }
  }, [loading, items]);

  const remove = async (id: number) => {
    if (!confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
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
          .from("testimonials")
          .update({
            author_name: editing.author_name,
            author_title: editing.author_title,
            content: editing.content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert([
          {
            author_name: editing.author_name,
            author_title: editing.author_title,
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
          <h1 className="text-3xl font-extrabold flex items-center gap-2 tracking-tight overflow-hidden">
            <FaQuoteLeft className="text-sky-500 scale-75" />
            <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
              Testimonials
            </span>
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Manage feedback from your students and community.</p>
        </div>
        <button 
          onClick={() => { setEditing({ author_name: "", author_title: "", content: "" }); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <FaPlus size={14} /> Add Testimonial
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-20 bg-[hsl(var(--card))] border-dashed">
          <div className="card-body">
            <FaQuoteLeft className="mx-auto text-4xl text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold">No testimonials found</h3>
            <p className="text-[hsl(var(--muted-foreground))]">Start by adding your first student testimonial.</p>
          </div>
        </div>
      ) : (
        <div className="card shadow-md overflow-hidden bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-semibold">
                <tr>
                  <th className="px-6 py-4">Author</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4 w-1/2">Content</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {items.map((item) => (
                  <tr key={item.id} className="item-row hover:bg-sky-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-sky-700">{item.author_name}</td>
                    <td className="px-6 py-4 text-[hsl(var(--muted-foreground))] italic">{item.author_title || "—"}</td>
                    <td className="px-6 py-4 line-clamp-2">{item.content}</td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button 
                        onClick={() => { setEditing(item); setShowModal(true); }}
                        className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
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
              <h2 className="text-xl font-bold mb-6">
                {editing?.id ? "Edit Testimonial" : "New Testimonial"}
              </h2>
              <form onSubmit={save} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Author Name *</label>
                  <input
                    required
                    className="input w-full"
                    value={editing?.author_name || ""}
                    onChange={(e) => setEditing({ ...editing, author_name: e.target.value })}
                    placeholder="e.g. Abdullah Muiz"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title (Optional)</label>
                  <input
                    className="input w-full"
                    value={editing?.author_title || ""}
                    onChange={(e) => setEditing({ ...editing, author_title: e.target.value })}
                    placeholder="e.g. BSc Computer Science / Student"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Message *</label>
                  <textarea
                    required
                    className="textarea w-full h-32"
                    value={editing?.content || ""}
                    onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                    placeholder="What did they say about the academy?"
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
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : editing?.id ? "Update Testimonial" : "Create Testimonial"}
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
