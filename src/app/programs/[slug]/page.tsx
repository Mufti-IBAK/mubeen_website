import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

interface ProgramDetailPageProps {
  params: {
    slug: string;
  };
}

export default async function ProgramDetailPage({ params }: ProgramDetailPageProps) {
  const { slug } = params;

  const { data: program, error } = await supabase
    .from('programs')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !program) {
    notFound();
  }

  const tags = program.tags ?? [];

  return (
    <div className="pt-16 bg-brand-bg">
      <div className="container px-6 py-20 mx-auto">
        <div className="overflow-hidden bg-white rounded-lg shadow-xl">
          <div className="relative w-full h-64 md:h-96">
            <Image src={program.image_url} alt={`Cover image for ${program.title}`} fill priority className="object-cover"/>
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <h1 className="text-3xl md:text-5xl text-center font-extrabold text-white font-heading [text-shadow:_0_2px_4px_rgb(0_0_0_/_40%)]">
                {program.title}
              </h1>
            </div>
          </div>
          <div className="p-6 md:p-10">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="mb-4 text-2xl font-bold text-brand-dark font-heading">Program Overview</h2>
                <p className="leading-relaxed text-brand-dark/80">{program.description}</p>
                <div className="mt-6">
                  <h3 className="mb-3 text-lg font-semibold text-brand-dark font-heading">Topics Covered</h3>
                  <div className="flex flex-wrap gap-3">
                    {tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 text-sm font-medium rounded-full bg-brand-primary/10 text-brand-primary">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-lg bg-brand-bg">
                <h3 className="mb-4 text-lg font-semibold text-brand-dark font-heading">Key Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-brand-dark/60">Duration</p>
                    <p className="font-semibold text-brand-dark">{program.duration}</p>
                  </div>
                  {program.is_flagship && ( <div><p className="text-sm text-brand-dark/60">Program Type</p><p className="font-semibold text-brand-primary">Flagship Program</p></div>)}
                </div>
                {/* FIX: The Link now passes the program slug as a query parameter */}
                <Link href={`/register?program=${program.slug}`} passHref>
                  <button className="w-full py-3 mt-6 font-semibold text-white transition-transform duration-300 ease-in-out rounded-md bg-brand-primary text-md hover:scale-105">
                    Register Now
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}