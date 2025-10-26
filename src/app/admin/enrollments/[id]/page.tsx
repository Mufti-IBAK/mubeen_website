import { Suspense } from 'react';
import { connection } from 'next/server';
import ClientPage from './client';

export default async function AdminEnrollmentPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const enrollmentId = Number(id);
  return (
    <Suspense fallback={<div className="text-[hsl(var(--muted-foreground))]">Loading…</div>}>
      <ClientPage id={enrollmentId} />
    </Suspense>
  );
}