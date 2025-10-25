import React, { Suspense } from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import AdminLayoutClient from "./layout-client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <Suspense fallback={<div className="p-6 text-[hsl(var(--muted-foreground))]">Loading admin…</div>}>
        <AdminLayoutClient>{children}</AdminLayoutClient>
      </Suspense>
    </AdminGate>
  );
}

