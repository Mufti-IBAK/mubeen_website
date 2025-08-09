import { CoreValuesSection } from "@/components/CoreValuesSection";
import { HeroSection } from "@/components/HeroSection";
import { TestimonialSlider, Testimonial, Quote } from "@/components/TestimonialSlider";
import { supabase } from "@/lib/supabaseClient";
import React from "react";

// The Home Page assembles all the sections of the page.
export default async function HomePage() {
  
  // Fetch testimonials and quotes concurrently for better performance
  const testimonialsPromise = supabase.from('testimonials').select('*');
  const quotesPromise = supabase.from('quotes').select('*');
  
  const [testimonialsResult, quotesResult] = await Promise.all([testimonialsPromise, quotesPromise]);

  const testimonials = testimonialsResult.data as Testimonial[] | null;
  const quotes = quotesResult.data as Quote[] | null;

  return (
    <>
      <HeroSection />
      <CoreValuesSection />
      {/* Pass the fetched data to our new slider component */}
      <TestimonialSlider 
        testimonials={testimonials ?? []} 
        quotes={quotes ?? []}
      />
    </>
  );
}