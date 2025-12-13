import React from "react";
import { PricingClient } from "./PricingClient";

export default function AdminPricingPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Global Pricing Manager</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Manage prices for all Programs and Skills in one place.
          </p>
        </div>
      </div>
      <PricingClient />
    </div>
  );
}
