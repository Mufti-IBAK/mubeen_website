'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export interface Program {
  id: number;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  tags: string[] | null;
  duration: string;
  is_flagship: boolean;
}

interface ProgramCardProps {
  program: Program;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({ program }) => {
  const card = useRef<HTMLDivElement>(null);
  const flipAnimation = useRef<gsap.core.Timeline | null>(null);

  useGSAP(() => {
    if (!card.current) return;
    const cardInner = card.current.querySelector('.card-inner');
    if (!cardInner) return;
    
    flipAnimation.current = gsap.timeline({ paused: true })
      .to(cardInner, { rotationY: 180, duration: 0.7, ease: 'power3.inOut' });
  }, { scope: card });

  const handleCardClick = () => {
    if (flipAnimation.current?.reversed()) {
      flipAnimation.current.play();
    } else {
      flipAnimation.current?.reverse();
    }
  };
  
  const tags = program.tags ?? [];

  return (
    <div ref={card} className="w-full h-96 [transform-style:preserve-3d] cursor-pointer" onClick={handleCardClick}>
      <div className="card-inner relative w-full h-full [transform-style:preserve-3d]">
        
        <div className="absolute w-full h-full bg-white rounded-lg shadow-lg overflow-hidden [backface-visibility:hidden]">
          <div className="relative w-full h-2/3">
            {/* FIX 2: This 'object-cover' class ensures the image scales correctly */}
            <Image
              src={program.image_url}
              alt={`Image for ${program.title}`}
              fill
              className="object-cover"
            />
            {program.is_flagship && (<span className="absolute px-2 py-1 text-xs font-bold text-white rounded-full top-2 right-2 bg-brand-primary">FLAGSHIP</span>)}
          </div>
          <div className="p-4">
            <h3 className="text-xl font-bold text-brand-dark font-heading">{program.title}</h3>
            <p className="mt-1 text-sm text-brand-dark/60">{program.duration}</p>
          </div>
        </div>

        <div className="absolute w-full h-full bg-brand-dark rounded-lg shadow-lg p-6 flex flex-col text-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <h3 className="text-2xl font-bold text-white font-heading">{program.title}</h3>
          <p className="flex-grow mt-3 text-base text-brand-light/80">{program.description}</p>
          <div className="flex flex-wrap justify-center gap-2 my-4">
            {tags.map(tag => (
              <span key={tag} className="px-2 py-1 text-xs font-medium rounded-full bg-brand-light/20 text-brand-light">{tag}</span>
            ))}
          </div>
          <Link href={`/programs/${program.slug}`} passHref onClick={(e) => e.stopPropagation()}>
            <button className="w-full rounded-md bg-brand-primary py-2.5 text-md font-semibold text-white transition-transform duration-300 ease-in-out hover:scale-105">
              View Details
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
};