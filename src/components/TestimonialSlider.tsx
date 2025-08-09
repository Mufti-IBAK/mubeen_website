'use client';

import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export interface Testimonial { id: number; author_name: string; author_title: string | null; content: string; type: 'testimonial'; }
export interface Quote { id: number; author_name: string; content: string; type: 'quote'; }
type Slide = Testimonial | Quote;
interface TestimonialSliderProps { testimonials: Testimonial[]; quotes: Quote[]; }

export const TestimonialSlider: React.FC<TestimonialSliderProps> = ({ testimonials, quotes }) => {
  // Setup the carousel with the autoplay plugin
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'center' }, [
    Autoplay({ delay: 15000, stopOnInteraction: true }) // Change slide every 15 seconds
  ]);

  const slides: Slide[] = React.useMemo(() => {
    const combined = [
        ...testimonials.map(t => ({ ...t, type: 'testimonial' as const })),
        ...quotes.map(q => ({ ...q, type: 'quote' as const }))
    ];
    return combined.sort(() => Math.random() - 0.5);
  }, [testimonials, quotes]);

  if (slides.length === 0) return null;

  return (
    <section className="bg-brand-bg py-20">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-brand-dark font-heading">Words of Wisdom & Praise</h2>
          <p className="mt-4 text-lg text-brand-dark/70">Inspiration from scholars and feedback from our students.</p>
        </div>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {slides.map((slide) => (
              // Each slide is a flex-basis-80% to show the next/prev cards
              <div key={`${slide.type}-${slide.id}`} className="flex-grow-0 flex-shrink-0 basis-full md:basis-4/5 lg:basis-3/5 xl:basis-2/5 px-4">
                <div className="bg-white p-8 rounded-lg shadow-lg h-full">
                  <p className="text-lg text-brand-dark/80 italic mb-6" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>&quot;{slide.content}&quot;</p>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="font-bold text-brand-primary font-heading">{slide.type === 'quote' ? `- ${slide.author_name}` : slide.author_name}</p>
                    {slide.type === 'testimonial' && <p className="text-sm text-gray-500">{slide.author_title}</p>}
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