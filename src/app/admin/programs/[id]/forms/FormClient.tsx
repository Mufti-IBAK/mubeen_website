"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FormBuilder, FormSchema } from "@/components/form-builder/FormBuilder";
import { FaUser, FaUserTie, FaUsers } from "react-icons/fa";

const types = [
  { key: "individual", label: "Individual", icon: FaUser },
  { key: "family_head", label: "Family Head", icon: FaUserTie },
  { key: "family_member", label: "Family Member", icon: FaUsers },
] as const;

type Key = typeof types[number]["key"];

export function ProgramFormsClient({ programId }: { programId: number }) {
  const [active, setActive] = useState<Key>("individual");
  const [schema, setSchema] = useState<FormSchema>({ title: "Registration Form", fields: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async (formType: Key) => {
    setLoading(true);
    const { data } = await supabase
      .from("program_forms")
      .select("id, schema")
      .eq("program_id", programId)
      .eq("form_type", formType)
      .single();
    if (data?.schema) setSchema(data.schema as FormSchema);
    else setSchema({ title: "Registration Form", fields: [] });
    setLoading(false);
  };

  useEffect(() => {
    load(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, programId]);

  const handleSave = async () => {
    setMessage("");
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      const res = await fetch('/api/admin/forms/upsert', {
        method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { 'authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify({ scope: 'program', id: programId, form_type: active, schema })
      });
      const json = await res.json();
      setMessage(res.ok && json?.ok ? 'Saved!' : (json?.error || 'Failed to save'));
    } catch (err: any) {
      setMessage(err?.message || 'Failed to save');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body">
          <h2 className="text-xl font-bold mb-1">Program Form Builder</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Create and manage the registration forms for this program.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex gap-2 mb-4">
            {types.map(t => {
              const Icon = t.icon;
              const activeTab = active === t.key;
              return (
                <button key={t.key} onClick={() => setActive(t.key)}
                  className={`px-3 py-2 rounded-md border flex items-center gap-2 hover-lift ${activeTab ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-transparent' : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]'}`}>
                  <Icon /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="card border border-[hsl(var(--border))]">
            <div className="card-body">
              {loading ? (
                <p className="text-[hsl(var(--muted-foreground))]">Loading form schema…</p>
              ) : (
                <FormBuilder initial={schema} onChange={setSchema} />
              )}
              <div className="mt-4 flex items-center gap-3">
                <button onClick={handleSave} className="btn-primary">Save Form</button>
                {message && <span className="text-sm text-[hsl(var(--muted-foreground))]">{message}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

