import React from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import UnpaidDetails from "./client";

export default async function AdminUnpaidDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminGate>
      <UnpaidDetails idParam={id} />
    </AdminGate>
  );
}
