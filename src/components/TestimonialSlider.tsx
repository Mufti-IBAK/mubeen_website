'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

// Define types for our data for type safety
export interface Testimonial {
  id: number;
  author_name: string;
  author_title: string | null;
  content: string;
  type: 'testimonial'; // Add a type discriminator
}
export interface Quote {
  id: number;
  author_name: string;
  content: string;
  type: 'quote'; // Add a type discriminator
}
type Slide = Testimonial | Quote;

interface TestimonialSliderProps {
  testimonials: Testimonial[];
  quotes: Quote[];
}

export const TestimonialSlider: React.FC<TestimonialSliderProps> = ({ testimonials, quotes }) => {
  const container = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Combine testimonials and quotes into a single, shuffled array for variety
  const slides: Slide[] = React.useMemo(() => {
    const combined = [
        ...testimonials.map(t => ({ ...t, type: 'testimonial' as const })),
        ...quotes.map(q => ({ ...q, type: 'quote' as const }))
    ];
    return combined.sort(() => Math.random() - 0.5); // Shuffle the array
  }, [testimonials, quotes]);

  // GSAP animation for the slide transition
  useGSAP(() => {
    if (!container.current) return;
    const slideElements = container.current.children;
    
    gsap.to(slideElements, {
      xPercent: -100 * currentIndex,
      duration: 0.8,
      ease: 'power3.inOut',
    });

  }, { dependencies: [currentIndex] });

  // Auto-play timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % slides.length);
    }, 7000); // Change slide every 7 seconds

    return () => clearInterval(timer); // Cleanup on unmount
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <section className="bg-brand-dark py-20 overflow-hidden">
      <div className="container mx-auto px-6">
        <div ref={container} className="flex">
          {slides.map((slide) => (
            <div key={`${slide.type}-${slide.id}`} className="flex-shrink-0 w-full text-center">
              {slide.type === 'testimonial' ? (
                // Testimonial Slide Layout
                <>
                  <p className="text-2xl md:text-3xl font-light text-white italic">&quot;{slide.content}&quot;</p>
                  <p className="mt-6 font-bold text-brand-primary font-heading">{slide.author_name}</p>
                  <p className="text-sm text-white/60">{slide.author_title}</p>
                </>
              ) : (
                // Quote Slide Layout
                <>
                  <p className="text-2xl md:text-3xl font-light text-white italic">&quot;{slide.content}&quot;</p>
                  <p className="mt-6 font-bold text-brand-primary font-heading">- {slide.author_name}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};