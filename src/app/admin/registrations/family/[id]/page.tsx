import React from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import FamilyDetailClient from "./client";

export default async function AdminFamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  return (
    <AdminGate>
      <FamilyDetailClient familyHeadId={resolvedParams.id} />
    </AdminGate>
  );
}
