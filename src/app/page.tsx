import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { TestimonialSlider, Testimonial, Quote } from "@/components/TestimonialSlider";
import { HeroIslamic } from "@/components/home/HeroIslamic";
import { CoreValuesSection } from "@/components/CoreValuesSection";
import { StatsBand } from "@/components/home/StatsBand";
import { HighlightCards } from "@/components/home/HighlightCards";
import { CTASection } from "@/components/home/CTASection";
import { FaqAccordion } from "@/components/FaqAccordion";
import { CoursesSlider } from "@/components/home/CoursesSlider";
import { SkillsSlider } from "@/components/home/SkillsSlider";
import { Program } from "@/components/ProgramCard";

export default async function HomePage() {
  // Fetch testimonials and quotes concurrently
  const [testimonialsResult, quotesResult, programsResult, plansResult, skillsResult, skillPlansResult] = await Promise.all([
    supabase.from('testimonials').select('*'),
    supabase.from('quotes').select('*'),
    supabase.from('programs').select('*').order('is_flagship', { ascending: false }),
    supabase.from('program_plans').select('program_id, price, currency'),
    supabase.from('skills').select('*').order('is_flagship', { ascending: false }),
    supabase.from('skill_plans').select('skill_id, price, currency'),
  ]);

  if ((testimonialsResult as any)?.error) {
    console.error('Failed to fetch testimonials:', (testimonialsResult as any).error);
  }
  if ((quotesResult as any)?.error) {
    console.error('Failed to fetch quotes:', (quotesResult as any).error);
  }

  const testimonials: Testimonial[] = ((testimonialsResult as any)?.data ?? []) as Testimonial[];
  const quotes: Quote[] = ((quotesResult as any)?.data ?? []) as Quote[];

  // Prepare programs with prices
  const rawPrograms = ((programsResult as any)?.data ?? []) as Program[];
  const plans = ((plansResult as any)?.data ?? []) as any[];
  const plansMap: Record<number, number> = {};
  const currencyMap: Record<number, string> = {};
  
  if (plans) {
    plans.forEach((p: any) => {
      if (!plansMap[p.program_id] || p.price < plansMap[p.program_id]) {
        plansMap[p.program_id] = p.price;
        currencyMap[p.program_id] = p.currency;
      }
    });
  }

  const programs = rawPrograms.map(p => ({
    ...p,
    price_start: plansMap[p.id] ? `${currencyMap[p.id]} ${plansMap[p.id].toLocaleString()}` : undefined
  }));

  // Prepare skills with prices
  const rawSkills = ((skillsResult as any)?.data ?? []) as Program[];
  const skillPlans = ((skillPlansResult as any)?.data ?? []) as any[];
  const skillPlansMap: Record<number, number> = {};
  const skillCurrencyMap: Record<number, string> = {};
  
  if (skillPlans) {
    skillPlans.forEach((p: any) => {
      if (!skillPlansMap[p.skill_id] || p.price < skillPlansMap[p.skill_id]) {
        skillPlansMap[p.skill_id] = p.price;
        skillCurrencyMap[p.skill_id] = p.currency;
      }
    });
  }

  const skills = rawSkills.map(p => ({
    ...p,
    price_start: skillPlansMap[p.id] ? `${skillCurrencyMap[p.id]} ${skillPlansMap[p.id].toLocaleString()}` : undefined
  }));

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
      <CoursesSlider programs={programs} />
      {skills.length > 0 && <SkillsSlider programs={skills} />}
      <TestimonialSlider testimonials={testimonials} quotes={quotes} />

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
