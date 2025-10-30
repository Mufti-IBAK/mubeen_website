import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import RegistrationFormClient from './RegistrationFormClient';

export const dynamic = 'force-dynamic';

export default async function RegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Fetch program
  const { data: program, error } = await supabase
    .from('programs')
    .select('id, title, slug, description')
    .eq('slug', slug)
    .single();

  if (error || !program) {
    notFound();
  }

  // Fetch form schemas for this program (individual, family_head)
  const { data: forms } = await supabase
    .from('program_forms')
    .select('form_type,schema')
    .eq('program_id', program.id);

  const schemas: Record<string, any> = {};
  (forms as any[] | null)?.forEach((r) => { if (r?.form_type && r?.schema) schemas[r.form_type] = r.schema; });

  return (
    <RegistrationFormClient
      program={program as any}
    />
  );
}
