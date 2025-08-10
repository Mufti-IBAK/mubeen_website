'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { localAssets } from '@/lib/imageData';
import { useSignUpModalStore } from '@/lib/store';

gsap.registerPlugin(ScrollTrigger);

export const HeroSection = () => {
  const container = useRef(null);
  const { openModal } = useSignUpModalStore();

  const headlines = [
    "Nurturing a community of learners to serve the Ummah",
    "To be a leading institution for authentic Islamic education"
  ];

  const [activeHeadlineIndex, setActiveHeadlineIndex] = useState(0);

  // This effect runs whenever the active headline index changes
  useGSAP(() => {
    const previousIndex = activeHeadlineIndex === 0 ? 1 : 0;
    
    // Animate the outgoing headline
    gsap.to(`.headline-${previousIndex}`, { opacity: 0, y: -40, duration: 0.5, ease: 'power3.in' });
    
    // Animate the incoming headline
    gsap.fromTo(`.headline-${activeHeadlineIndex}`, 
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.4 }
    );
  }, { dependencies: [activeHeadlineIndex] });

  // This effect handles the auto-rotation timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHeadlineIndex(prevIndex => (prevIndex + 1) % headlines.length);
    }, 10000); // Rotate every 10 seconds

    return () => clearInterval(timer); // Cleanup the timer
  }, []);

  return (
    <section ref={container} className="relative isolate flex items-center justify-center h-[90vh] text-white overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src={localAssets.heroBackground.src} alt={localAssets.heroBackground.alt} fill priority className="object-cover hero-bg-image" />
        <div className="absolute inset-0 bg-brand-primary/30" />
      </div>
      
      <div className="container mx-auto px-6 text-center flex flex-col items-center">
        <div className="relative min-h-[12rem] md:min-h-[14rem] w-full flex items-center justify-center">
          {headlines.map((text, index) => (
            <h1 key={index} className={`headline-${index} absolute text-5xl md:text-6xl lg:text-7xl font-black font-heading leading-tight [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)] ${index === 0 ? 'opacity-100' : 'opacity-0'}`}>
              {text}
            </h1>
          ))}
        </div>
        
        <p className="mt-4 text-xl md:text-2xl text-white/80 max-w-3xl mx-auto font-semibold [text-shadow:_0_2px_3px_rgb(0_0_0_/_30%)]">
          Through knowledge (&apos;Ilm), character (Adab), and action (&apos;Amal).
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/programs" passHref><button className="w-full sm:w-auto rounded-md bg-white px-8 py-3 text-lg font-semibold text-brand-dark transition-transform duration-300 ease-in-out hover:scale-105">Explore Programs</button></Link>
          {/* This button now correctly opens the sign-up modal */}
          <button onClick={openModal} className="w-full sm:w-auto rounded-md border border-white/50 bg-white/10 px-8 py-3 text-lg font-semibold text-white transition-all duration-300 ease-in-out hover:bg-white/20 hover:border-white">
            Register
          </button>
        </div>
      </div>
    </section>
  );
};