import React from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import EnrollmentsClient from "./client";

export default function AdminEnrollmentsPage() {
  return (
    <AdminGate>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">Enrollments</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">View and manage all program enrollments</p>
        </div>
        <EnrollmentsClient />
      </div>
    </AdminGate>
  );
}
