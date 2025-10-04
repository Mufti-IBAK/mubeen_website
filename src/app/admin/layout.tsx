import React from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import AdminLayoutClient from "./layout-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AdminGate>
  );
}

