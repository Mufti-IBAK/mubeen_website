'use client';

import React, { useRef, useEffect, useState } from 'react';
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
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [currentHeadline, setCurrentHeadline] = useState(1);

  const animateText = (outgoingSelector: string, incomingSelector: string) => {
    gsap.to(outgoingSelector, { y: -80, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'power3.in' });
    gsap.fromTo(incomingSelector, { y: 80, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: 'power3.out', delay: 0.3 });
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!isHovering) {
        setCurrentHeadline(prev => {
          const next = prev === 1 ? 2 : 1;
          if (next === 2) {
            animateText('.headline-1 .split-word', '.headline-2 .split-word');
          } else {
            animateText('.headline-2 .split-word', '.headline-1 .split-word');
          }
          return next;
        });
      }
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovering]);
  
  const handleTextHover = () => {
    setIsHovering(true);
    if (currentHeadline === 1) {
      animateText('.headline-1 .split-word', '.headline-2 .split-word');
      setCurrentHeadline(2);
    }
  };

  const handleTextLeave = () => {
    setIsHovering(false);
    // Note: We don't animate back on leave, the interval will handle it.
  };

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }});
    tl.from('.split-word-initial', { y: 80, opacity: 0, stagger: 0.08, duration: 1, delay: 0.5 });
    
    gsap.to('.hero-bg-image', {
      y: '20%', ease: 'none',
      scrollTrigger: { trigger: container.current, start: 'top top', end: 'bottom top', scrub: true },
    });
  }, { scope: container });

  return (
    <section ref={container} className="relative isolate flex items-center justify-center h-[90vh] text-white overflow-hidden">
        <div className="absolute inset-0 -z-10">
            <Image src={localAssets.heroBackground.src} alt={localAssets.heroBackground.alt} fill priority className="object-cover hero-bg-image" />
            <div className="absolute inset-0 bg-brand-primary/30" />
        </div>
      <div className="container mx-auto px-6 text-center py-12">
        <div className="relative" onMouseEnter={handleTextHover} onMouseLeave={handleTextLeave}>
          <h1 className="headline-1 text-5xl md:text-6xl lg:text-7xl font-black font-heading leading-tight [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)]">
            {headline1.split(" ").map((word, index) => (
              <span key={index} className="inline-block overflow-hidden pb-2"><span className="split-word-initial inline-block mr-3">{word}</span></span>
            ))}
          </h1>
          <h1 className="headline-2 absolute inset-0 text-5xl md:text-6xl lg:text-7xl font-black font-heading leading-tight [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)]">
            {headline2.split(" ").map((word, index) => (
              <span key={index} className="inline-block overflow-hidden pb-2"><span className="split-word inline-block mr-3 opacity-0">{word}</span></span>
            ))}
          </h1>
        </div>
        <p className="mt-6 text-xl md:text-2xl text-white/80 max-w-3xl mx-auto font-semibold [text-shadow:_0_2px_3px_rgb(0_0_0_/_30%)]">
          Through knowledge (&apos;Ilm), character (Adab), and action (&apos;Amal).
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/programs" passHref><button className="w-full sm:w-auto rounded-md bg-white px-8 py-3 text-lg font-semibold text-brand-dark transition-transform duration-300 ease-in-out hover:scale-105">Explore Programs</button></Link>
          <Link href="/register" passHref><button className="w-full sm:w-auto rounded-md border border-white/50 bg-white/10 px-8 py-3 text-lg font-semibold text-white transition-all duration-300 ease-in-out hover:bg-white/20 hover:border-white">Register Now</button></Link>
        </div>
      </div>
    </section>
  );
};