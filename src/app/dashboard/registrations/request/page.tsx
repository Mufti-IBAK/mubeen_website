import { Suspense } from "react";
import { connection } from "next/server";
import ClientPage from "./ClientPage";

export default async function RegistrationRequestPage({ searchParams }: { searchParams: Promise<{ type?: string; id?: string }> }) {
  // Ensure this route is fully dynamic and not prerendered (avoids CSR bailout warnings)
  await connection();

  const sp = await searchParams;
  const type = (sp?.type || "").toLowerCase();
  const idNum = sp?.id ? Number(sp.id) : 0;
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[hsl(var(--muted-foreground))]">Loading…</div>}>
      <ClientPage initialType={type} initialId={idNum} />
    </Suspense>
  );
}
