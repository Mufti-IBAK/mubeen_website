import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";
import RegistrationFormClient from "./RegistrationFormClient";
// import { defaultSkillUpForm } from '@/lib/templates/skill-up-default';

export const dynamic = "force-dynamic";

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch skill (not program)
  const { data: skill, error } = await supabase
    .from("skills")
    .select("id, title, slug, description")
    .eq("slug", slug)
    .single();

  if (error || !skill) {
    notFound();
  }

  // Fetch form schemas for this skill
  const { data: forms } = await supabase
    .from("skill_forms")
    .select("form_type,schema")
    .eq("skill_id", skill.id);

  // If no forms, we could pass null or a default, handled in client
  const schemas: Record<string, any> = {};
  (forms as any[] | null)?.forEach((r) => {
    if (r?.form_type && r?.schema) schemas[r.form_type] = r.schema;
  });

  return <RegistrationFormClient skill={skill as any} />;
}
