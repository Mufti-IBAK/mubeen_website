"use client";

import React, { useState, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ProgramCard, Program } from '@/components/ProgramCard';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Link from 'next/link';

interface CoursesSliderProps {
  programs: (Program & { price_start?: string; start_date?: string; created_at?: string })[];
}

type Tab = 'flagship' | 'upcoming' | 'newest' | 'ongoing';

export const CoursesSlider: React.FC<CoursesSliderProps> = ({ programs }) => {
  const [activeTab, setActiveTab] = useState<Tab>('flagship');
  const [emblaRef] = useEmblaCarousel({ align: 'start', loop: false });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredPrograms = useMemo(() => {
    const now = new Date();
    switch (activeTab) {
      case 'flagship':
        return programs.filter(p => p.is_flagship);
      case 'upcoming':
        return programs.filter(p => p.start_date && new Date(p.start_date) > now).sort((a,b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime());
      case 'newest':
        // Sort by created_at desc (if available) or id desc
        return [...programs].sort((a,b) => (b.created_at ? new Date(b.created_at).getTime() : b.id) - (a.created_at ? new Date(a.created_at).getTime() : a.id));
      case 'ongoing':
        return programs.filter(p => !p.start_date || new Date(p.start_date) <= now);
      default:
        return programs;
    }
  }, [programs, activeTab]);

  useGSAP(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current.querySelectorAll('.slider-card'), 
      { opacity: 0, y: 20 }, 
      { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, clearProps: 'all' }
    );
  }, { scope: containerRef, dependencies: [activeTab] });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'flagship', label: 'Flagship Courses' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'newest', label: 'Newest' },
    { id: 'ongoing', label: 'Ongoing' },
  ];

  return (
    <section className="py-16 bg-[hsl(var(--card))]/50 border-y border-[hsl(var(--border))]" ref={containerRef}>
      <div className="container-page">
        <div className="mb-10 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Discover Our Programs</h2>
          
          <div className="inline-flex flex-wrap justify-center gap-2 bg-[hsl(var(--muted))] p-1 rounded-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-white text-black shadow-sm'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[hsl(var(--muted-foreground))]">No programs found in this category right now.</p>
            <Link href="/programs" className="text-brand-primary hover:underline mt-2 inline-block">View all programs</Link>
          </div>
        ) : (
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4 md:gap-6 py-4">
              {filteredPrograms.map((program) => (
                <div key={program.id} className="slider-card flex-[0_0_85%] sm:flex-[0_0_60%] md:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0 pl-2">
                  <ProgramCard program={program} />
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-center mt-8">
           <Link href="/programs" className="btn-outline">View All Programs</Link>
        </div>
      </div>
    </section>
  );
};
