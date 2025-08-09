import { RegistrationForm } from '@/components/RegistrationForm';
import { SimpleRegistrationForm } from '@/components/SimpleRegistrationForm';
import { Program } from '@/components/ProgramCard';
import { supabase } from '@/lib/supabaseClient';
import { Plan } from '@/types';
import React from 'react';

interface RegisterPageProps {
  searchParams: { program?: string; };
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  // If no program slug is in the URL, we'll handle that case (e.g., show a program selector or default)
  const programSlug = searchParams.program;

  // Fetch the program details based on the slug
  const { data: selectedProgram } = await supabase
    .from('programs')
    .select('*')
    .eq('slug', programSlug)
    .single<Program>();
  
  // Fetch the plans for the 24-month program if it's the one selected
  let availablePlans: Plan[] = [];
  if (selectedProgram?.is_flagship) {
    const { data: plansData } = await supabase
      .from('plans')
      .select('*')
      .eq('program_slug', selectedProgram.slug);
    availablePlans = plansData ?? [];
  }

  return (
    <div className="bg-brand-bg py-20">
      <div className="container mx-auto px-6">
        {/* 
          This is the core logic:
          - If the selected program is the flagship, show the detailed form.
          - Otherwise, show the simple inquiry form.
        */}
        {selectedProgram?.is_flagship ? (
          <RegistrationForm 
            selectedProgram={selectedProgram}
            availablePlans={availablePlans} 
          />
        ) : (
          <SimpleRegistrationForm 
            selectedProgram={selectedProgram}
          />
        )}
      </div>
    </div>
  );
}