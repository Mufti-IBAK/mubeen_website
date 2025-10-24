"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const stats = [
  { label: "Years of Service", value: "5+" },
  { label: "Students", value: "100+" },
  { label: "Programs", value: "10+" },
  { label: "Weekly Sessions", value: "5+" },
];

export const StatsBand: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);
    const items = root.current?.querySelectorAll('.sb-item');
    if (items && items.length) {
      gsap.from(items, {
        opacity: 0,
        y: 10,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: root.current as Element,
          start: 'top 85%',
          once: true,
        },
      });
    }
  }, { scope: root });

  return (
    <section ref={root} className="py-8 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border-y border-[hsl(var(--border))]">
      <div className="container-page">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="sb-item rounded-lg bg-white/70 backdrop-blur px-5 py-6 border border-white shadow-sm text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-sky-700">{s.value}</div>
              <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
