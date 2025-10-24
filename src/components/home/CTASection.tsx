"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";

export const CTASection: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = root.current?.querySelector(".cta-card");
    if (!el) return;
    gsap.fromTo(
      el,
      { scale: 0.98, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" },
    );
  }, { scope: root });

  return (
    <section ref={root} className="py-20">
      <div className="container-page">
        <div className="cta-card relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-8 md:p-12">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-sky-400/20 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-indigo-400/20 blur-2xl" />
          <h2 className="text-3xl md:text-4xl font-extrabold">Begin your journey in Ilm</h2>
          <p className="mt-3 max-w-2xl text-[hsl(var(--muted-foreground))]">
            Enroll in a program and join a community committed to knowledge and service.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/programs" className="btn-primary px-6 py-3">Explore Programs</Link>
            <Link href="/about" className="btn-outline px-6 py-3">About Mubeen</Link>
          </div>
        </div>
      </div>
    </section>
  );
};
