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
    <div className="pt-16 bg-brand-bg">
      <div className="container px-6 py-20 mx-auto">
        
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold md:text-5xl text-brand-dark font-heading">
            Our Educational Offerings
          </h1>
          <p className="max-w-2xl mx-auto mt-4 text-lg text-brand-dark/70">
            Explore our comprehensive programs designed to nurture knowledge and character.
          </p>
        </div>

        {/* 
          FIX 1: Switched from 'grid' to 'flex'.
          - 'flex-wrap' allows items to wrap to the next line.
          - 'justify-center' centers the items horizontally.
          This will naturally center the last row, whether it has one, two, or three items.
        */}
        <div className="flex flex-wrap justify-center gap-8">
          {programs.map((program: Program) => (
            // We give each card a specific width for each screen size
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