"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";

export const HeroIslamic: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(".hi-title", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 })
      .fromTo(".hi-sub", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.3")
      .fromTo(".hi-cta", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.2");

    gsap.to(".hi-orb", { y: 12, repeat: -1, yoyo: true, duration: 3, ease: "sine.inOut", stagger: 0.25 });
  }, { scope: root });

  return (
    <section ref={root} className="relative isolate overflow-hidden">
      {/* Animated gradient background reminiscent of North/West African palettes */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-10 hi-orb h-64 w-64 rounded-full bg-sky-400/25 blur-2xl" />
        <div className="absolute -bottom-10 -right-10 hi-orb h-72 w-72 rounded-full bg-indigo-400/25 blur-2xl" />
        <div className="absolute top-1/2 left-1/4 hi-orb h-48 w-48 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-2xl" />
        {/* Subtle pattern overlay */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.07] text-[hsl(var(--foreground))]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="kufi" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 20H40M20 0V40" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#kufi)" />
        </svg>
      </div>

      <div className="container-page py-28 md:py-36 text-center">
        <h1 className="hi-title text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
          <span className="bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
            Knowledge with Ihsān
          </span>
        </h1>
        <p className="hi-sub mx-auto mt-5 max-w-3xl text-lg md:text-2xl text-[hsl(var(--muted-foreground))]">
          Authentic Islamic learning with a modern, elegant experience.
        </p>
        <div className="hi-cta mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/programs" className="btn-primary px-8 py-3">Explore Programs</Link>
          <Link href="/login?mode=signup" className="btn-outline px-8 py-3">Join the Academy</Link>
        </div>
      </div>
    </section>
  );
};
