import React from 'react';
import Client from './client';
import { AdminGate } from '@/components/admin/AdminGate';

export default async function UserRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminGate>
      <Client idParam={id} />
    </AdminGate>
  );
}