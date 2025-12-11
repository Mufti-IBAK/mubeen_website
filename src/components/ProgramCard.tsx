"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export interface Program {
  id: number;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  tags: string[] | null;
  duration: string;
  is_flagship: boolean;
  price_start?: string;
}

interface ProgramCardProps {
  program: Program;
  basePath?: string;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({
  program,
  basePath = "/programs",
}) => {
  const card = useRef<HTMLDivElement>(null);
  const flipAnimation = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      if (!card.current) return;
      const cardInner = card.current.querySelector(".card-inner");
      if (!cardInner) return;

      flipAnimation.current = gsap
        .timeline({ paused: true })
        .to(cardInner, { rotationY: 180, duration: 0.7, ease: "power3.inOut" });
    },
    { scope: card }
  );

  const handleCardClick = () => {
    if (flipAnimation.current?.reversed()) {
      flipAnimation.current.play();
    } else {
      flipAnimation.current?.reverse();
    }
  };

  const tags = program.tags ?? [];

  return (
    <div
      ref={card}
      className="w-full h-[26rem] sm:h-96 [transform-style:preserve-3d] cursor-pointer group"
      onClick={handleCardClick}
    >
      <div className="card-inner relative w-full h-full [transform-style:preserve-3d] transition-all duration-500">
        <div className="absolute w-full h-full bg-white rounded-xl shadow-md border border-[hsl(var(--border))] overflow-hidden [backface-visibility:hidden]">
          <div className="relative w-full h-[55%]">
            {/* FIX 2: This 'object-cover' class ensures the image scales correctly */}
            <Image
              src={program.image_url || "/placeholder-image.jpg"} // Provide a fallback if necessary or handle in component
              alt={`Image for ${program.title}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {program.is_flagship && (
              <span className="absolute px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-white rounded-full top-3 right-3 bg-brand-primary shadow-sm">
                Flagship
              </span>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-xl font-bold text-brand-dark font-heading line-clamp-2">
              {program.title}
            </h3>
            <p className="mt-1 text-sm text-brand-dark/60">
              {program.duration}
            </p>
            {program.price_start && (
              <p className="mt-2 text-md font-bold text-brand-primary">
                {program.price_start}
              </p>
            )}
          </div>
        </div>

        <div className="absolute w-full h-full bg-brand-dark rounded-lg shadow-lg p-6 flex flex-col text-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-y-auto">
          <h3 className="text-xl font-bold text-white font-heading">
            {program.title}
          </h3>
          {program.price_start && (
            <p className="text-brand-primary font-bold bg-white/10 rounded-full px-3 py-1 inline-block mt-2 mb-1 text-sm">
              {program.price_start}
            </p>
          )}
          <p className="flex-grow mt-3 text-sm text-brand-light/80 overflow-y-auto max-h-[120px] scrollbar-thin scrollbar-thumb-brand-light/20 scrollbar-track-transparent">
            {program.description}
          </p>
          <div className="flex flex-wrap justify-center gap-2 my-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-[10px] font-medium rounded-full bg-brand-light/20 text-brand-light"
              >
                {tag}
              </span>
            ))}
          </div>
          <Link
            href={`${basePath}/${program.slug}`}
            passHref
            onClick={(e) => e.stopPropagation()}
          >
            <button className="w-full rounded-md bg-brand-primary py-2 text-sm font-semibold text-white transition-transform duration-300 ease-in-out hover:scale-105">
              View Details
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};
