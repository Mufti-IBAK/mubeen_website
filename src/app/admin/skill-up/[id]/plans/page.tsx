import React from "react";
import { PlansClient } from "./PlansClient";

export default async function SkillPlansPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlansClient skillId={Number(id)} />;
}
