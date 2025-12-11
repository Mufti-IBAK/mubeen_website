import React from "react";
import Link from "next/link";
import { ProgramFormsClient } from "./FormClient";

export default async function ProgramFormsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programId = Number(id);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand-dark font-heading">Program Forms</h1>
        <Link href={`/admin/programs`}>Back to Programs</Link>
      </div>
      <ProgramFormsClient programId={programId} />
    </div>
  );
}

