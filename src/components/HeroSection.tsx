'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { localAssets } from '@/lib/imageData';

gsap.registerPlugin(ScrollTrigger);

export const HeroSection = () => {
  const container = useRef(null);
  const headline1 = "Nurturing a community of learners to serve the Ummah";
  const headline2 = "To be a leading institution for authentic Islamic education";

  useGSAP(() => {
    // GSAP animations (unchanged)
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }});
    tl.from('.split-word', { y: 80, opacity: 0, stagger: 0.08, duration: 1, delay: 0.5 });
    
    gsap.to('.hero-bg-image', {
      y: '20%',
      ease: 'none',
      scrollTrigger: {
        trigger: container.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }, { scope: container });

  const handleTextHover = () => {
    gsap.to('.headline-1 .split-word', { y: -80, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'power3.in' });
    gsap.fromTo('.headline-2 .split-word', { y: 80, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: 'power3.out', delay: 0.3 });
  };

  const handleTextLeave = () => {
    gsap.to('.headline-2 .split-word', { y: -80, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'power3.in' });
    gsap.fromTo('.headline-1 .split-word', { y: 80, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: 'power3.out', delay: 0.3 });
  };

  return (
    <section 
      ref={container} 
      className="relative isolate flex items-center justify-center text-white overflow-hidden h-[90vh]"
    >
      <div className="absolute inset-0 -z-10">
        <Image
          src={localAssets.heroBackground.src}
          alt={localAssets.heroBackground.alt}
          fill
          priority
          className="object-cover hero-bg-image"
        />
        <div className="absolute inset-0 bg-brand-primary/30" />
      </div>

      <div className="container px-6 py-12 mx-auto text-center">
        <div 
          className="relative"
          onMouseEnter={handleTextHover}
          onMouseLeave={handleTextLeave}
        >
          {/* FIX 1: Main text is now larger on mobile (text-5xl) */}
          <h1 className="headline-1 text-5xl md:text-6xl lg:text-7xl font-black font-heading leading-tight [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)]">
            {headline1.split(" ").map((word, index) => (
              <span key={index} className="inline-block pb-2 overflow-hidden"><span className="inline-block mr-3 split-word">{word}</span></span>
            ))}
          </h1>
          <h1 className="headline-2 absolute inset-0 text-5xl md:text-6xl lg:text-7xl font-black font-heading leading-tight [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)]">
            {headline2.split(" ").map((word, index) => (
              <span key={index} className="inline-block pb-2 overflow-hidden"><span className="inline-block mr-3 opacity-0 split-word">{word}</span></span>
            ))}
          </h1>
        </div>
        
        {/* FIX 1 & 2: Sub-text is larger on mobile (text-xl) and has a shadow */}
        <p className="mt-6 text-xl md:text-2xl text-white/80 max-w-3xl mx-auto font-semibold [text-shadow:_0_2px_3px_rgb(0_0_0_/_30%)]">
          Through knowledge (&apos;Ilm), character (Adab), and action (&apos;Amal).
        </p>

        <div className="flex flex-col items-center justify-center gap-4 mt-10 sm:flex-row">
          <Link href="/programs" passHref>
            <button className="w-full px-8 py-3 text-lg font-semibold transition-transform duration-300 ease-in-out bg-white rounded-md sm:w-auto text-brand-dark hover:scale-105">
              Explore Programs
            </button>
          </Link>
          <Link href="/register" passHref>
            <button className="w-full px-8 py-3 text-lg font-semibold text-white transition-all duration-300 ease-in-out border rounded-md sm:w-auto border-white/50 bg-white/10 hover:bg-white/20 hover:border-white">
              Register Now
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
};