"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export const ProgramsShowcase: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const cards = root.current?.querySelectorAll(".ps-card");
    if (cards && cards.length) {
      gsap.from(cards, { opacity: 0, y: 24, duration: 0.6, stagger: 0.08, ease: "power2.out" });
    }
  }, { scope: root });

  const items = [
    { title: "Foundations", desc: "Start your journey with essentials in faith, worship, and character.", color: "from-sky-500 to-blue-700" },
    { title: "Arabic Track", desc: "Reading, grammar, and expression to access the tradition firsthand.", color: "from-cyan-500 to-sky-700" },
    { title: "Advanced Studies", desc: "Dive into tafsir, hadith, and law with guided mentorship.", color: "from-indigo-500 to-blue-800" },
  ];

  return (
    <section ref={root} className="py-16">
      <div className="container-page">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold">Programs</h2>
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">A pathway for every learner — from beginner to advanced.</p>
          </div>
          <Link href="/programs" className="btn-outline">View all</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((it, idx) => (
            <div key={idx} className="ps-card group rounded-xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
              <div className={`h-2 bg-gradient-to-r ${it.color}`} />
              <div className="p-5">
                <h3 className="text-lg font-semibold">{it.title}</h3>
                <p className="mt-2 text-[hsl(var(--muted-foreground))]">{it.desc}</p>
                <Link href="/programs" className="mt-4 inline-block text-emerald-700 hover:underline">Explore →</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
