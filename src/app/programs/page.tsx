import { supabase } from '@/lib/supabaseClient';
import { ProgramCard, Program } from '@/components/ProgramCard';
import React from 'react';

export const revalidate = 3600; 

async function ProgramsPage(): Promise<React.JSX.Element> {
  
  const { data: programs, error } = await supabase
    .from('programs')
    .select('*')
    .order('is_flagship', { ascending: false });

  if (error || !programs) {
    console.error("Supabase error:", error?.message);
    return (
      <div className="bg-brand-bg">
        <div className="container px-6 py-20 mx-auto text-center">
          <h1 className="text-4xl font-bold text-brand-dark">Something Went Wrong</h1>
          <p className="mt-4 text-lg text-brand-dark/70">We couldn&apos;t load the programs at this time. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 bg-[hsl(var(--background))]">
      <div className="container-page py-16">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold md:text-5xl">All Programs</h1>
          <p className="max-w-2xl mx-auto mt-3 text-[hsl(var(--muted-foreground))]">
            Explore courses designed to nurture knowledge and character.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {programs.map((program: Program) => (
            <div key={program.id} className="w-full md:w-[45%] lg:w-[30%]">
              <ProgramCard program={program} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProgramsPage;