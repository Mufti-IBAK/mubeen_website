'use client';

import React, { useState } from 'react';

// Define the shape of a single FAQ item for type safety
interface FaqItem {
  question: string;
  answer: string;
}

// Define the props for our accordion component
interface FaqAccordionProps {
  items: FaqItem[];
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    // If the clicked item is already open, close it. Otherwise, open the new one.
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="border-b border-gray-200">
            {/* The button is the trigger for the accordion item */}
            <button
              onClick={() => handleToggle(index)}
              className="w-full flex justify-between items-center text-left py-4"
              aria-expanded={openIndex === index}
              aria-controls={`faq-answer-${index}`}
            >
              <h3 className="text-lg font-semibold text-brand-dark font-heading">
                {item.question}
              </h3>
              {/* This SVG icon rotates based on the open state */}
              <svg
                className={`w-5 h-5 text-brand-primary flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'transform rotate-45' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </button>
            {/* The answer panel that expands/collapses */}
            <div
              id={`faq-answer-${index}`}
              className="grid transition-all duration-500 ease-in-out"
              style={{ gridTemplateRows: openIndex === index ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="pb-4 text-brand-dark/70">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};