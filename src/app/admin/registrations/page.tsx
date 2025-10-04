import React from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import RegistrationsClient from "./client";

export default function AdminRegistrationsPage() {
  return (
    <AdminGate>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">Registrations</h1>
        </div>
        <RegistrationsClient />
      </div>
    </AdminGate>
  );
}

