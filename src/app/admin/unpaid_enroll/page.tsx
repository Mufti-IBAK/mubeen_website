import React from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import UnpaidClient from "./client";

export default function AdminUnpaidPage() {
  return (
    <AdminGate>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">Unpaid Enrollments</h1>
        </div>
        <UnpaidClient />
      </div>
    </AdminGate>
  );
}
