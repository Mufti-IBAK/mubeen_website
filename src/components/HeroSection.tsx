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
  const [isHovering, setIsHovering] = React.useState(false);

  React.useEffect(() => {
    const rotateHeadlines = () => {
      if (isHovering) return;
      let currentIndex = headlineRefs.current.findIndex(h => h?.classList.contains('is-active'));
      if (currentIndex === -1) currentIndex = 0;
      
      const nextIndex = (currentIndex + 1) % headlines.length;
      const currentHeadline = headlineRefs.current[currentIndex];
      const nextHeadline = headlineRefs.current[nextIndex];
      if (!currentHeadline || !nextHeadline) return;

      const currentWords = gsap.utils.toArray(currentHeadline.querySelectorAll('.split-word'));
      const nextWords = gsap.utils.toArray(nextHeadline.querySelectorAll('.split-word'));
      
      gsap.timeline()
        .to(currentWords, { yPercent: -100, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'power3.in' })
        .call(() => { currentHeadline.classList.remove('is-active'); nextHeadline.classList.add('is-active'); })
        .fromTo(nextWords, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: 'power3.out' });
    };

    intervalRef.current = setInterval(rotateHeadlines, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isHovering, headlines.length]);

  useGSAP(() => {
    // FIX: Add a guard clause to ensure the element exists before animating
    const firstHeadlineWords = headlineRefs.current[0]?.querySelectorAll('.split-word-initial');
    if (firstHeadlineWords) {
      gsap.from(firstHeadlineWords, { yPercent: 100, opacity: 0, stagger: 0.08, duration: 1, ease: 'power3.out', delay: 0.5 });
    }
    
    gsap.to('.hero-bg-image', { y: '20%', ease: 'none', scrollTrigger: { trigger: container.current, start: 'top top', end: 'bottom top', scrub: true } });
  }, { scope: container });

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  return (
    <section ref={container} className="relative isolate flex items-center justify-center h-[90vh] text-white overflow-hidden" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="absolute inset-0 -z-10">
        <Image src={localAssets.heroBackground.src} alt={localAssets.heroBackground.alt} fill priority className="object-cover hero-bg-image" />
        <div className="absolute inset-0 bg-brand-primary/30" />
      </div>
      <div className="container mx-auto px-6 text-center">
        <div className="relative h-48 md:h-56 lg:h-64 mb-6">
          {headlines.map((text, index) => (
            <h1 key={index} ref={el => { headlineRefs.current[index] = el; }}
              className={`absolute inset-0 flex flex-col justify-center items-center text-5xl md:text-6xl lg:text-7xl font-black font-heading leading-tight [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)] ${index === 0 ? 'is-active' : ''}`}
            >
              <span className="inline-block">
                {text.split(" ").map((word, i) => (
                  <span key={i} className="inline-block overflow-hidden pb-2 align-bottom">
                    <span className={`inline-block mr-3 ${index === 0 ? 'split-word-initial' : 'split-word opacity-0'}`}>{word}</span>
                  </span>
                ))}
              </span>
            </h1>
          ))}
        </div>
        <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto font-semibold [text-shadow:_0_2px_3px_rgb(0_0_0_/_30%)]">
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