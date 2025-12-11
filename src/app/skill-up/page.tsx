import { supabase } from '@/lib/supabaseClient';
import { ProgramCard, Program } from '@/components/ProgramCard';
import React from 'react';

export const revalidate = 0;

async function ProgramsPage(): Promise<React.JSX.Element> {
  let programs: (Program & { price_start?: string })[] = [];
  let fetchError = false;
  // Define helper type directly or import, but here we just extend Program


  try {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('is_flagship', { ascending: false });
    
    if (error) throw error;
    
    // Fetch plans to determine starting price
    const { data: plans } = await supabase.from('skill_plans').select('skill_id, price, currency');
    const plansMap: Record<number, number> = {};
    const currencyMap: Record<number, string> = {};

    if (plans) {
      plans.forEach((p: any) => {
        if (!plansMap[p.skill_id] || p.price < plansMap[p.skill_id]) {
          plansMap[p.skill_id] = p.price;
          currencyMap[p.skill_id] = p.currency;
        }
      });
    }

    programs = ((data || []) as Program[]).map(p => ({
      ...p,
      price_start: plansMap[p.id] ? `${currencyMap[p.id]} ${plansMap[p.id].toLocaleString()}` : undefined
    }));
  } catch (error: any) {
    fetchError = true;
    // Log error server-side but don't crash
    console.warn('Programs fetch failed:', error?.message);
  }

  if (fetchError) {
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
          <h1 className="text-4xl font-extrabold md:text-5xl">Skill Up</h1>
          <p className="max-w-2xl mx-auto mt-3 text-[hsl(var(--muted-foreground))]">
            Master new skills with our specialized courses.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {programs.map((program: Program) => (
            <div key={program.id} className="w-full md:w-[45%] lg:w-[30%]">
              <ProgramCard program={program} basePath="/skill-up" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProgramsPage;