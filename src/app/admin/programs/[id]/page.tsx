import React from "react";
import AdminProgramsEditClient from "./EditClient";

export default async function AdminProgramsEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminProgramsEditClient programId={Number(id)} />;
}
