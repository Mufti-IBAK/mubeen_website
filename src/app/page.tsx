import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { TestimonialSlider, Testimonial, Quote } from "@/components/TestimonialSlider";
import { HeroIslamic } from "@/components/home/HeroIslamic";
import { CoreValuesSection } from "@/components/CoreValuesSection";
import { StatsBand } from "@/components/home/StatsBand";
import { HighlightCards } from "@/components/home/HighlightCards";
import { ProgramsShowcase } from "@/components/home/ProgramsShowcase";
import { CTASection } from "@/components/home/CTASection";
import { FaqAccordion } from "@/components/FaqAccordion";

export default async function HomePage() {
  // Fetch testimonials and quotes concurrently
  const [testimonialsResult, quotesResult] = await Promise.all([
    supabase.from('testimonials').select('*'),
    supabase.from('quotes').select('*'),
  ]);

  const testimonials = testimonialsResult.data as Testimonial[] | null;
  const quotes = quotesResult.data as Quote[] | null;

  const faqData = [
    {
      question: "Who is the 24-Month Program for?",
      answer: "This program is designed for sincere seekers of authentic Islamic knowledge, regardless of age or background. It is ideal for those who want a structured, comprehensive curriculum covering the core sciences of the Deen."
    },
    {
      question: "What are the technical requirements to join?",
      answer: "You will need a stable internet connection, a device (computer, tablet, or smartphone) with a modern web browser, and the ability to join live sessions via standard video conferencing software. All materials are accessible through our student portal."
    },
    {
      question: "What if I miss a live class?",
      answer: "We understand that schedules can be demanding. All live sessions are recorded and made available to students within 24 hours, so you can catch up at your own convenience."
    },
    {
      question: "How are payments handled?",
      answer: "Payments are processed securely through our trusted payment partner, Flutterwave. We accept various methods including card, bank transfer, and USSD for your convenience. Enrollment is confirmed upon successful payment."
    }
  ];

  return (
    <>
      <HeroIslamic />
      <StatsBand />
      <CoreValuesSection />
      <HighlightCards />
      <ProgramsShowcase />
      <TestimonialSlider testimonials={testimonials ?? []} quotes={quotes ?? []} />

      {/* Homepage FAQ */}
      <section className="py-16 bg-brand-bg">
        <div className="container-page">
          <div className="mb-8 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold">Frequently Asked Questions</h2>
          </div>
          <FaqAccordion items={faqData} />
        </div>
      </section>

      <CTASection />
    </>
  );
}
