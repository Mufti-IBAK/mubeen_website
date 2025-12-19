import { supabase } from "@/lib/supabaseClient";
import { ProgramCard, Program } from "@/components/ProgramCard";
import React from "react";

export const revalidate = 0;

async function ProgramsPage(): Promise<React.JSX.Element> {
  let programs: (Program & { price_start?: string })[] = [];
  let fetchError = false;
  // Define helper type directly or import, but here we just extend Program

  try {
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .order("is_flagship", { ascending: false });

    if (error) throw error;

    // Unified Pricing Check (pricing_plans)
    const { data: plans } = await supabase
      .from("pricing_plans")
      .select("entity_id, price, currency, subscription_type")
      .eq("entity_type", "skill");

    const plansMap: Record<number, number> = {};
    const currencyMap: Record<number, string> = {};
    const subMap: Record<number, string> = {};

    if (plans) {
      plans.forEach((p: any) => {
        plansMap[p.entity_id] = p.price;
        currencyMap[p.entity_id] = p.currency;
        subMap[p.entity_id] = p.subscription_type;
      });
    }

    // Fetch slot counts (enrollments with status='paid' or 'registered')
    const { data: enrollmentCounts } = await supabase
      .from("enrollments")
      .select("skill_id")
      .or('status.eq.paid,status.eq.registered');

    const enrollCountMap: Record<number, number> = {};
    (enrollmentCounts || []).forEach((e: any) => {
      if (e.skill_id) {
        enrollCountMap[e.skill_id] = (enrollCountMap[e.skill_id] || 0) + 1;
      }
    });

    programs = ((data || []) as any[]).map(s => {
       const period = subMap[s.id] === 'one-time' ? '' : `/${subMap[s.id] === 'monthly' ? 'mo' : (subMap[s.id] === 'yearly' ? 'yr' : 'wk')}`;
       return {
         ...s,
         paid_count: enrollCountMap[s.id] || 0,
         price_start: plansMap[s.id] ? `${currencyMap[s.id]} ${plansMap[s.id].toLocaleString()}${period}` : undefined
       };
    });
  } catch (error: any) {
    fetchError = true;
    // Log error server-side but don't crash
    console.warn("Programs fetch failed:", error?.message);
  }

  if (fetchError) {
    return (
      <div className="bg-brand-bg">
        <div className="container px-6 py-20 mx-auto text-center">
          <h1 className="text-4xl font-bold text-brand-dark">
            Something Went Wrong
          </h1>
          <p className="mt-4 text-lg text-brand-dark/70">
            We couldn&apos;t load the programs at this time. Please try again
            later.
          </p>
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
