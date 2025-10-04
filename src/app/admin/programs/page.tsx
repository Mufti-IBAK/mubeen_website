"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";

type Program = {
  id: number;
  title: string;
  slug: string;
  is_flagship: boolean;
  image_url?: string | null;
  description?: string | null;
};

export default function AdminProgramsListPage() {
  const [items, setItems] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("programs")
        .select("id, title, slug, is_flagship, image_url, description")
        .order("id", { ascending: false });
      setItems((data as Program[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!gridRef.current) return;
      const cards = gridRef.current.querySelectorAll(".prog-card");
      gsap.set(cards, { opacity: 1, y: 0 });
      gsap.from(cards, { y: 12, opacity: 0, duration: 0.35, ease: "power2.out", stagger: 0.05 });
    }, gridRef);
    return () => ctx.revert();
  }, [items.length]);

  const remove = async (id: number) => {
    if (!confirm("Delete this program?")) return;
    await supabase.from("programs").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent">Programs</h1>
        <Link href="/admin/programs/new" className="btn-primary">New Program</Link>
      </div>

      {loading ? (
        <div className="card"><div className="card-body"><p className="text-[hsl(var(--muted-foreground))]">Loading...</p></div></div>
      ) : items.length === 0 ? (
        <div className="card"><div className="card-body"><p className="text-[hsl(var(--muted-foreground))]">No programs yet. Click the button to add one.</p></div></div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p.id} className="prog-card rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden hover:shadow-md hover-lift transition">
              <div className="relative h-36 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))]">
                {p.image_url ? (
                  <Image src={p.image_url} alt={p.title} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 opacity-20" />
                )}
                {p.is_flagship && (
                  <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-white/90 text-[hsl(var(--foreground))] px-2.5 py-0.5 text-xs font-medium shadow">
                    Flagship
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div>
                  <h3 className="text-lg font-semibold">{p.title}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">/{p.slug}</p>
                </div>
                {p.description && (
                  <p className="text-sm line-clamp-2 text-[hsl(var(--muted-foreground))]">{p.description}</p>
                )}
                <div className="pt-2 flex items-center gap-2">
                  <Link href={`/admin/programs/${p.id}`} className="btn-outline px-3 py-1">Edit</Link>
                  <Link href={`/admin/programs/${p.id}/forms`} className="btn-outline px-3 py-1">Forms</Link>
                  <button onClick={() => remove(p.id)} className="btn-destructive px-3 py-1 ml-auto">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

