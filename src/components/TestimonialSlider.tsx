'use client';

import React, { useEffect, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export interface Testimonial { id: number; author_name: string; author_title: string | null; content: string; type: 'testimonial'; }
export interface Quote { id: number; author_name: string; content: string; type: 'quote'; }
type Slide = Testimonial | Quote;
interface TestimonialSliderProps { testimonials: Testimonial[]; quotes: Quote[]; }

export const TestimonialSlider: React.FC<TestimonialSliderProps> = ({ testimonials, quotes }) => {
  const root = useRef<HTMLDivElement>(null);
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'center' }, [
    Autoplay({ delay: 7000, stopOnInteraction: true, stopOnMouseEnter: true })
  ]);

  useGSAP(() => {
    const cards = root.current?.querySelectorAll('.ts-card');
    if (cards && cards.length) {
      gsap.from(cards, { opacity: 0, y: 16, duration: 0.5, stagger: 0.08, ease: 'power2.out' });
    }
  }, { scope: root });

  const slides: Slide[] = React.useMemo(() => {
    const t = testimonials.map(t => ({ ...t, type: 'testimonial' as const }));
    const q = quotes.map(q => ({ ...q, type: 'quote' as const }));
    const out: Slide[] = [];
    const max = Math.max(t.length, q.length);
    for (let i = 0; i < max; i++) {
      if (i < t.length) out.push(t[i]);
      if (i < q.length) out.push(q[i]);
    }
    return out;
  }, [testimonials, quotes]);

  if (slides.length === 0) return null;

  return (
    <section className="bg-brand-bg py-20" ref={root}>
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-brand-dark font-heading">Words of Wisdom & Praise</h2>
          <p className="mt-4 text-lg text-brand-dark/70">Inspiration from scholars and feedback from our students.</p>
        </div>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {slides.map((slide) => (
              <div key={`${slide.type}-${slide.id}`} className="flex-grow-0 flex-shrink-0 basis-full md:basis-4/5 lg:basis-3/5 px-4">
                <div className="ts-card relative p-[1px] rounded-xl bg-gradient-to-br from-sky-500/30 to-indigo-600/30">
                  <div className="rounded-xl bg-white p-8 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.3)] h-full flex flex-col">
                    <svg aria-hidden className="h-8 w-8 text-sky-500 mb-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.17 6A5.99 5.99 0 0 0 2 12c0 3.31 2.69 6 6 6 .55 0 1-.45 1-1v-4c0-.55-.45-1-1-1-.67 0-1.3.16-1.86.44A4.005 4.005 0 0 1 7.17 8H9c.55 0 1-.45 1-1V7c0-.55-.45-1-1-1H7.17Zm9 0A5.99 5.99 0 0 0 11 12c0 3.31 2.69 6 6 6 .55 0 1-.45 1-1v-4c0-.55-.45-1-1-1-.67 0-1.3.16-1.86.44A4.005 4.005 0 0 1 16.17 8H18c.55 0 1-.45 1-1V7c0-.55-.45-1-1-1h-1.83Z"/></svg>
                    <p className="text-lg md:text-xl text-center font-medium text-brand-dark/80 italic flex-grow">
                      &quot;{slide.content}&quot;
                    </p>
                    <div className="border-t border-gray-200 pt-6 mt-6 text-left">
                      <p className="font-bold text-sky-600 font-heading">{slide.type === 'quote' ? `- ${slide.author_name}` : slide.author_name}</p>
                      {slide.type === 'testimonial' && <p className="text-sm text-gray-500">{slide.author_title}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
