"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const items = [
  {
    title: "Community of Learning",
    desc: "Weekly live sessions and study circles that build consistency and belonging.",
    color: "from-sky-500/20 to-blue-600/20",
  },
  {
    title: "Mentored Progress",
    desc: "Guidance from teachers to help you navigate texts and grow with clarity.",
    color: "from-indigo-500/20 to-purple-600/20",
  },
  {
    title: "Real Outcomes",
    desc: "Tracks designed to produce measurable growth in your ilm and character.",
    color: "from-cyan-500/20 to-emerald-600/20",
  },
];

export const HighlightCards: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);
    const cards = root.current?.querySelectorAll(".hc-card");
    if (cards && cards.length) {
      gsap.from(cards, {
        y: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: root.current as Element,
          start: "top 85%",
          once: true,
        },
      });
    }
  }, { scope: root });

  return (
    <section ref={root} className="py-12">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((it, idx) => (
            <div
              key={idx}
              className={cn(
                "hc-card relative rounded-xl p-[1px] bg-gradient-to-br",
                it.color,
                "transition-transform will-change-transform hover:-translate-y-1"
              )}
            >
              <div className="rounded-xl bg-[hsl(var(--card))] p-5 h-full shadow-md">
                <div className="absolute -z-10 inset-6 rounded-xl blur-2xl opacity-50" />
                <h3 className="text-lg font-semibold">{it.title}</h3>
                <p className="mt-2 text-[hsl(var(--muted-foreground))]">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
