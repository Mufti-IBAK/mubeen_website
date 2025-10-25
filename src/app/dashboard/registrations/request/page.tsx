import { Suspense } from "react";
import ClientPage from "./ClientPage";

export default async function RegistrationRequestPage({ searchParams }: { searchParams: Promise<{ type?: string; id?: string }> }) {
  const sp = await searchParams;
  const type = (sp?.type || "").toLowerCase();
  const idNum = sp?.id ? Number(sp.id) : 0;
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[hsl(var(--muted-foreground))]">Loading…</div>}>
      <ClientPage initialType={type} initialId={idNum} />
    </Suspense>
  );
}

