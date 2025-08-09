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
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="space-y-4">
        {items.map((item, index) => {
          // FIX: Create an explicit boolean variable for the current item's state.
          const isExpanded = openIndex === index;

          return (
            <div key={index} className="border-b border-gray-200">
              <button
                onClick={() => handleToggle(index)}
                className="w-full flex justify-between items-center text-left py-4"
                // FIX: Use the explicit boolean variable here.
                aria-expanded={isExpanded}
                aria-controls={`faq-answer-${index}`}
              >
                <h3 className="text-lg font-semibold text-brand-dark font-heading">
                  {item.question}
                </h3>
                <svg
                  className={`w-5 h-5 text-brand-primary flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'transform rotate-45' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
              </button>
              <div
                id={`faq-answer-${index}`}
                className="grid transition-all duration-500 ease-in-out"
                style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="pb-4 text-brand-dark/70">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};