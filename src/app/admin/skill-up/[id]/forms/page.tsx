import React from "react";
import Link from "next/link";
import { SkillFormsClient } from "./FormClient";

export default async function SkillFormsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skillId = Number(id);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand-dark font-heading">Skill Forms</h1>
        <Link href={`/admin/skill-up`}>Back to Skills</Link>
      </div>
      <SkillFormsClient skillId={skillId} />
    </div>
  );
}
