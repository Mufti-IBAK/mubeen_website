import { Suspense } from "react";
import { connection } from "next/server";
import ClientPage from "./ClientPage";

export default async function PaymentGuidePage({ searchParams }: { searchParams: Promise<{ draft?: string; plan?: string }> }) {
  await connection();
  const sp = await searchParams;
  const draftId = sp?.draft ? Number(sp.draft) : 0;
  const planId = sp?.plan ? Number(sp.plan) : 0;
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[hsl(var(--muted-foreground))]">Loading…</div>}>
      <ClientPage draftId={draftId} planId={planId} />
    </Suspense>
  );
}
