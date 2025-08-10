'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { localAssets } from '@/lib/imageData';

gsap.registerPlugin(ScrollTrigger);

export const HeroSection = () => {
  const container = React.useRef(null);
  const headlines = [
    "Nurturing a community of learners to serve the Ummah",
    "To be a leading institution for authentic Islamic education",
    "Fostering character, knowledge, and action",
    "Your journey to authentic knowledge begins here"
  ];
  const headlineRefs = React.useRef<(HTMLHeadingElement | null)[]>([]);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  useGSAP(() => {
    const headlinesArray = headlineRefs.current.filter(el => el !== null) as HTMLElement[];
    if (headlinesArray.length < 2) return;

    let currentIndex = 0;

    // Set initial state for all headlines: make all invisible except the first.
    gsap.set(headlinesArray, { autoAlpha: 0 });
    gsap.set(headlinesArray[0], { autoAlpha: 1 });
    
    const firstHeadlineWords = headlinesArray[0].querySelectorAll('.split-word');
    gsap.from(firstHeadlineWords, { yPercent: 100, stagger: 0.08, duration: 1, ease: 'power3.out', delay: 0.5 });
    
    const rotateHeadlines = () => {
      const currentHeadline = headlinesArray[currentIndex];
      const nextIndex = (currentIndex + 1) % headlinesArray.length;
      const nextHeadline = headlinesArray[nextIndex];

      const currentWords = currentHeadline.querySelectorAll('.split-word');
      const nextWords = nextHeadline.querySelectorAll('.split-word');
      
      const tl = gsap.timeline();
      tl.to(currentWords, { yPercent: -100, stagger: 0.05, duration: 0.5, ease: 'power3.in' })
        .set(currentHeadline, { autoAlpha: 0 }) // Explicitly hide the old headline
        .set(nextHeadline, { autoAlpha: 1 }) // Explicitly show the new headline
        // FIX: Reset the state of the words before animating them in.
        .fromTo(nextWords, { yPercent: 100 }, { yPercent: 0, stagger: 0.05, duration: 0.5, ease: 'power3.out' });

      currentIndex = nextIndex;
    };

    intervalRef.current = setInterval(rotateHeadlines, 5000); // Changed to 5 seconds as requested

    gsap.to('.hero-bg-image', {
      y: '20%', ease: 'none',
      scrollTrigger: { trigger: container.current, start: 'top top', end: 'bottom top', scrub: true },
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, { scope: container });

  return (
    <section ref={container} className="relative isolate flex items-center justify-center h-[90vh] text-white overflow-hidden">
        <div className="absolute inset-0 -z-10">
            <Image src={localAssets.heroBackground.src} alt={localAssets.heroBackground.alt} fill priority className="object-cover hero-bg-image" />
            <div className="absolute inset-0 bg-brand-primary/30" />
        </div>
      <div className="container mx-auto px-6 text-center py-12">
        <div className="relative h-48 md:h-64">
            {headlines.map((text, index) => (
                <h1 key={index} ref={el => { headlineRefs.current[index] = el; }} className="absolute inset-0 text-5xl md:text-6xl lg:text-7xl font-black font-heading leading-tight [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)]">
                {text.split(" ").map((word, i) => (
                    <span key={i} className="inline-block overflow-hidden pb-2 align-bottom">
                        <span className="inline-block mr-3 split-word">{word}</span>
                    </span>
                ))}
                </h1>
            ))}
        </div>
        <p className="pt-10 mt-10 md:pt-0 md:mt-6 text-xl md:text-2xl text-white/80 max-w-3xl mx-auto font-semibold [text-shadow:_0_2px_3px_rgb(0_0_0_/_30%)] ">Through knowledge (&apos;Ilm), character (Adab), and action (&apos;Amal).</p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/programs" passHref><button className="w-full sm:w-auto rounded-md bg-white px-8 py-3 text-lg font-semibold text-brand-dark transition-transform duration-300 ease-in-out hover:scale-105">Explore Programs</button></Link>
            <Link href="/register" passHref><button className="w-full sm:w-auto rounded-md border border-white/50 bg-white/10 px-8 py-3 text-lg font-semibold text-white transition-all duration-300 ease-in-out hover:bg-white/20 hover:border-white">Register Now</button></Link>
        </div>
      </div>
    </section>
  );
};