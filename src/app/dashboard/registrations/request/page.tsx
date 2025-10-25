import { Suspense } from "react";
import ClientPage from "./ClientPage";

export default function RegistrationRequestPage({ searchParams }: { searchParams: { type?: string; id?: string } }) {
  const type = (searchParams?.type || "").toLowerCase();
  const idNum = searchParams?.id ? Number(searchParams.id) : 0;
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[hsl(var(--muted-foreground))]">Loading…</div>}>
      <ClientPage initialType={type} initialId={idNum} />
    </Suspense>
  );
}

