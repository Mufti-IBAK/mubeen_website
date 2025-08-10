import { RegistrationForm } from '@/components/RegistrationForm';
import { Program } from '@/components/ProgramCard';
import { supabase } from '@/lib/supabaseClient';
import { Plan } from '@/types';
import React from 'react';

interface RegisterPageProps {
  searchParams: { program?: string; };
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const programSlug = searchParams.program || 'islamic-foundations-program';
  
  const programPromise = supabase.from('programs').select('*').eq('slug', programSlug).single<Program>();
  const plansPromise = supabase.from('plans').select('*').eq('program_slug', programSlug);

  const [programResult, plansResult] = await Promise.all([programPromise, plansPromise]);

  const selectedProgram = programResult.data;
  const availablePlans = plansResult.data as Plan[] | null;

  // We are now also fetching ALL programs to pass to the form, in case the user
  // wants to switch programs (a feature for the simplified forms).
  const { data: allPrograms } = await supabase.from('programs').select('title, slug');

  return (
    <div className="bg-brand-bg py-20">
      <div className="container mx-auto px-6">
        <RegistrationForm 
          selectedProgram={selectedProgram}
          availablePlans={availablePlans ?? []}
          allPrograms={allPrograms ?? []} 
        />
      </div>
    </div>
  );
}