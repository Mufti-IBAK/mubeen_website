import { supabase } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

export const dynamic = 'force-dynamic';

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: program, error } = await supabase
    .from('programs')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !program) {
    notFound();
  }

  const tags = program.tags ?? [];

  const now = new Date();
  const deadlineStr = program.enrollment_deadline as string | null;
  const deadlineAt = deadlineStr ? new Date(deadlineStr) : null;
  const isClosed = !!deadlineAt && deadlineAt.getTime() < now.getTime();

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
                {program.overview ? (
                  <div className="prose max-w-none prose-emerald prose-lg text-brand-dark/80 prose-headings:font-heading prose-headings:font-bold prose-p:leading-relaxed prose-li:marker:text-brand-primary [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5" dangerouslySetInnerHTML={{ __html: program.overview }} />
                ) : (
                  <p className="leading-relaxed text-brand-dark/80">{program.description}</p>
                )}
                {program.prerequisites && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-lg font-semibold text-brand-dark font-heading">Prerequisites</h3>
                    <div className="prose max-w-none prose-emerald text-brand-dark/80 prose-li:marker:text-brand-primary [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5" dangerouslySetInnerHTML={{ __html: program.prerequisites }} />
                  </div>
                )}
                {program.outcomes && program.outcomes.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-lg font-semibold text-brand-dark font-heading">Learning Outcomes</h3>
                    <ul className="list-disc pl-6 space-y-1 text-brand-dark/80">
                      {program.outcomes.map((o: string) => (<li key={o}>{o}</li>))}
                    </ul>
                  </div>
                )}
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
                  {program.level && (
                    <div>
                      <p className="text-sm text-brand-dark/60">Level</p>
                      <p className="font-semibold text-brand-dark">{program.level}</p>
                    </div>
                  )}
                  {program.language && (
                    <div>
                      <p className="text-sm text-brand-dark/60">Language</p>
                      <p className="font-semibold text-brand-dark">{program.language}</p>
                    </div>
                  )}
                  {program.start_date && (
                    <div>
                      <p className="text-sm text-brand-dark/60">Start Date</p>
                      <p className="font-semibold text-brand-dark">{program.start_date}</p>
                    </div>
                  )}
                  {program.enrollment_deadline && (
                    <div>
                      <p className="text-sm text-brand-dark/60">Enrollment Deadline</p>
                      <p className="font-semibold text-brand-dark">{program.enrollment_deadline}</p>
                    </div>
                  )}
                  {program.is_flagship && ( <div><p className="text-sm text-brand-dark/60">Program Type</p><p className="font-semibold text-brand-primary">Flagship Program</p></div>)}
                </div>
                {/* Registration button with deadline guard */}
                {isClosed ? (
                  <button className="w-full py-3 mt-6 font-semibold text-white rounded-md bg-gray-400 cursor-not-allowed" disabled>
                    Registration closed
                  </button>
                ) : (
                  <Link href={`/programs/${program.slug}/register`} prefetch>
                    <button className="w-full py-3 mt-6 font-semibold text-white transition-transform duration-300 ease-in-out rounded-md bg-brand-primary text-md hover:scale-105">
                      Register Now
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Instructors */}
            {Array.isArray((program as any).instructors) && (program as any).instructors.length > 0 && (
              <div className="mt-12">
                <h2 className="mb-4 text-2xl font-bold text-brand-dark font-heading">Meet the Instructors</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(program as any).instructors.map((ins: any, idx: number) => (
                    <div key={idx} className="rounded-xl border border-[hsl(var(--border))] bg-white shadow-sm p-4 flex items-center gap-4">
                      <div className="relative h-16 w-16 rounded-full overflow-hidden bg-brand-bg">
                        {ins.avatar_url ? (
                          <Image src={ins.avatar_url} alt={ins.name || 'Instructor'} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-brand-dark/60 font-semibold">
                            {(ins.name || 'M').slice(0,1)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-brand-dark">{ins.name}</p>
                        {ins.title && <p className="text-sm text-brand-dark/70">{ins.title}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs */}
            {Array.isArray((program as any).faqs) && (program as any).faqs.length > 0 && (
              <div className="mt-12">
                <h2 className="mb-4 text-2xl font-bold text-brand-dark font-heading">Frequently Asked Questions</h2>
                <div className="space-y-3">
                  {(program as any).faqs.map((f: any, idx: number) => (
                    <details key={idx} className="group rounded-lg border border-[hsl(var(--border))] bg-white p-4">
                      <summary className="cursor-pointer list-none font-medium text-brand-dark">
                        {(f.q || f.question) as string}
                      </summary>
                      <div className="mt-2 text-brand-dark/80">
                        {(f.a || f.answer) as string}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule timeline */}
            {(((program as any).schedule?.items && Array.isArray((program as any).schedule.items)) || Array.isArray((program as any).schedule)) && (
              <div className="mt-12">
                <h2 className="mb-4 text-2xl font-bold text-brand-dark font-heading">Schedule</h2>
                <ol className="relative border-l border-[hsl(var(--border))] ml-3">
                  {((Array.isArray((program as any).schedule?.items) ? (program as any).schedule.items : (program as any).schedule) as any[]).map((s: any, idx: number) => (
                    <li key={idx} className="mb-6 ml-4">
                      <div className="absolute w-3 h-3 bg-[hsl(var(--primary))] rounded-full -left-1.5 border border-white" />
                      <time className="mb-1 text-sm font-normal leading-none text-brand-dark/60">{s.when || s.date}</time>
                      <h3 className="text-lg font-semibold text-brand-dark">{s.title || s.name}</h3>
                      {s.description && <p className="text-brand-dark/80">{s.description}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
