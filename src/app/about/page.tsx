import { CoreValuesSection } from '@/components/CoreValuesSection';
import { FaqAccordion } from '@/components/FaqAccordion';
import Image from 'next/image';
import React from 'react';

// FAQ data that we will pass to our accordion component
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

export default function AboutPage() {
  return (
    <div className="bg-white text-brand-dark">
      {/* Section 1: Page Header / Mission */}
      <section className="pt-32 pb-20 bg-brand-bg">
        <div className="container px-6 mx-auto text-center">
          <h1 className="text-4xl font-extrabold md:text-5xl text-brand-dark font-heading">
            Our Mission
          </h1>
          <p className="max-w-3xl mx-auto mt-4 text-lg md:text-xl text-brand-dark/70">
            Nurturing a community of learners who will serve the Ummah with knowledge (‘Ilm), character (Adab), and action (‘Amal).
          </p>
        </div>
      </section>

      {/* Section 2: Our Story / Vision */}
      <section className="py-20">
        <div className="container px-6 mx-auto">
            <div className="text-center">
                <h2 className="text-3xl font-extrabold md:text-4xl text-brand-dark font-heading">Our Vision</h2>
                <p className="max-w-3xl mx-auto mt-4 text-lg text-brand-dark/70">
                    To be a leading global institution for accessible, authentic, and transformative Islamic education, empowering Muslims to confidently practice their faith and contribute positively to society.
                </p>
            </div>
        </div>
      </section>
      
      {/* Section 3: Core Values (Reusing our component) */}
      <CoreValuesSection />

      {/* Section 4: Meet the Founder */}
      <section className="py-20 bg-brand-bg">
        <div className="container px-6 mx-auto text-center">
          <h2 className="mb-12 text-3xl font-extrabold md:text-4xl text-brand-dark font-heading">Meet Our Founder</h2>
          <div className="max-w-md mx-auto">
             <Image 
src="/logo.png"
                alt="Dr. Mufti Ibn Al Khattāb"
                width={150}
                height={150}
                className="mx-auto rounded-full shadow-lg"
             />
             <h3 className="mt-6 text-2xl font-bold font-heading text-brand-dark">Dr. Mufti Ibn Al Khattāb</h3>
             <p className="mt-1 font-semibold text-brand-primary">Founder & Lead Instructor</p>
             <p className="mt-4 text-brand-dark/70">
                With decades of experience in Islamic jurisprudence and a passion for teaching, Dr. Mufti founded Mubeen Academy to bridge the gap between classical Islamic scholarship and the contemporary Muslim.
             </p>
          </div>
        </div>
      </section>

      {/* Section 5: FAQ */}
      <section className="py-20">
        <div className="container px-6 mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold md:text-4xl text-brand-dark font-heading">Frequently Asked Questions</h2>
          </div>
          <FaqAccordion items={faqData} />
        </div>
      </section>
    </div>
  );
}