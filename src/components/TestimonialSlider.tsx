'use client';

import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export interface Testimonial { id: number; author_name: string; author_title: string | null; content: string; type: 'testimonial'; }
export interface Quote { id: number; author_name: string; content: string; type: 'quote'; }
type Slide = Testimonial | Quote;
interface TestimonialSliderProps { testimonials: Testimonial[]; quotes: Quote[]; }

export const TestimonialSlider: React.FC<TestimonialSliderProps> = ({ testimonials, quotes }) => {
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'center' }, [
    Autoplay({ delay: 15000, stopOnInteraction: true, stopOnMouseEnter: true })
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
              <div key={`${slide.type}-${slide.id}`} className="flex-grow-0 flex-shrink-0 basis-full md:basis-4/5 lg:basis-3/5 px-4">
                {/* FIX: Card now has a shadow */}
                <div className="bg-white p-8 rounded-lg shadow-xl h-full flex flex-col">
                  {/* FIX: Content is centered and quote is bolder */}
                  <p className="text-xl text-center font-semibold text-brand-dark/80 italic flex-grow [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)]">
                    &quot;{slide.content}&quot;
                  </p>
                  {/* FIX: Author section is now left-aligned */}
                  <div className="border-t border-gray-200 pt-6 mt-6 text-left">
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