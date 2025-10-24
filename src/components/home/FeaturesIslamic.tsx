"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Tafsir & Hadith",
    desc: "Deep study of Qur'an and Sunnah with classical and contemporary relevance.",
  },
  {
    title: "Arabic Language",
    desc: "From foundational literacy to advanced grammar and rhetoric.",
  },
  {
    title: "Aqīdah & Fiqh",
    desc: "Sound creed and jurisprudence grounded in the mainstream tradition.",
  },
  {
    title: "Character & Service",
    desc: "Formation of adab and community impact as lived practice.",
  },
];

export const FeaturesIslamic: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);
    const els = root.current?.querySelectorAll(".fi-card");
    if (els && els.length) {
      gsap.from(els, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: root.current as Element,
          start: "top 85%",
          once: true,
        },
      });
    }
  }, { scope: root });

  return (
    <section ref={root} className="py-20 bg-brand-bg">
      <div className="container-page">
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold">Our Pillars</h2>
          <p className="mt-3 text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
            A holistic curriculum built on sound knowledge and practice.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div key={i} className={cn("fi-card relative z-0 group rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-all", "hover:-translate-y-1 hover:shadow-md/70")}> 
              <div className="h-10 w-10 rounded-full bg-sky-500/10 text-sky-700 grid place-content-center font-bold">{i+1}</div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-[hsl(var(--muted-foreground))]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
