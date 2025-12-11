import React from "react";
import RegistrationsByProgramClient from "./client";

export default async function AdminProgramRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programId = Number(id);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Program Registrations</h1>
      </div>
      <RegistrationsByProgramClient programId={programId} />
    </div>
  );
}

