import React from "react";
import AdminSkillsEditClient from "./EditClient";

export default async function AdminSkillsEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminSkillsEditClient skillId={Number(id)} />;
}
