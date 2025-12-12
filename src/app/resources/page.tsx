"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResourcesPage() {
  const [rows, setRows] = useState<
    Array<{
      id: number;
      title: string;
      description?: string;
      file_url: string;
      category?: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("resources")
        .select("id, title, description, file_url, category")
        .order("id", { ascending: false });
      setRows((data as any[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="bg-[hsl(var(--background))] pt-20 pb-24">
      <div className="container-page">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold">
            Resource Library
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-2">
            Downloadable materials and documents.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <p className="text-[hsl(var(--muted-foreground))]">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-[hsl(var(--muted-foreground))]">
              No resources yet.
            </p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="card flex flex-col">
                <div className="card-body">
                  <h3 className="text-lg font-semibold mb-1">{r.title}</h3>
                  {r.description && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
                      {r.description}
                    </p>
                  )}
                  <a
                    href={r.file_url}
                    target="_blank"
                    className="mt-2 btn-primary w-full text-center"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
