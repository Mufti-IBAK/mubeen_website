import React from "react";
import Client from "./client";

export default async function UserRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="container-page py-8">
      <Client idParam={id} />
    </div>
  );
}
