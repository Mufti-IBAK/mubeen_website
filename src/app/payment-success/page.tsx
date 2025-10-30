import { Suspense } from 'react';
import ClientPage from './ClientPage';

export default async function PaymentSuccess(props: { searchParams?: Promise<{ ref?: string; tx_ref?: string }> }) {
  const searchParams = await props.searchParams;
  const ref = searchParams?.ref || searchParams?.tx_ref || '';
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[hsl(var(--muted-foreground))]">Processing payment…</div>}>
      <ClientPage refVal={ref} />
    </Suspense>
  );
}
