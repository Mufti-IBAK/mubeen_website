"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FormBuilder, FormSchema } from "@/components/form-builder/FormBuilder";
import { defaultProgramForm } from "@/lib/templates/program-default";
import { defaultSkillUpForm } from "@/lib/templates/skill-up-default";

type Entity = { id: number; title: string; type: "program" | "skill" };

export default function GlobalFormsPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadEntities = async () => {
      const { data: progs } = await supabase
        .from("programs")
        .select("id, title");
      const { data: skills } = await supabase
        .from("skills")
        .select("id, title");

      const combined: Entity[] = [
        ...(progs || []).map((p: any) => ({ ...p, type: "program" as const })),
        ...(skills || []).map((s: any) => ({ ...s, type: "skill" as const })),
      ];
      setEntities(combined);
    };
    loadEntities();
  }, []);

  const loadForm = async (entity: Entity) => {
    setLoading(true);
    setMessage("");
    setSelected(entity);

    const table = entity.type === "program" ? "program_forms" : "skill_forms";
    const idKey = entity.type === "program" ? "program_id" : "skill_id";
    const defaultSchema =
      entity.type === "program" ? defaultProgramForm : defaultSkillUpForm;

    const { data } = await supabase
      .from(table)
      .select("schema")
      .eq(idKey, entity.id)
      .eq("form_type", "individual")
      .maybeSingle();

    let current = (data?.schema as FormSchema) || defaultSchema;
    const desired = `Register for ${entity.title}`;
    if (!current.title || current.title !== desired) {
      current = { ...current, title: desired };
    }

    setSchema(current);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selected || !schema) return;
    setSaving(true);
    setMessage("");
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      const res = await fetch("/api/admin/forms/upsert", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          scope: selected.type,
          id: selected.id,
          form_type: "individual",
          schema,
        }),
      });
      const json = await res.json();
      setMessage(
        res.ok && json?.ok
          ? "Saved successfully!"
          : json?.error || "Failed to save"
      );
    } catch (err: any) {
      setMessage(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-body">
          <h1 className="text-2xl font-bold mb-2">Global Form Manager</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Manage registration forms for all programs and skills in one place.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card h-[calc(100vh-16rem)] flex flex-col">
            <div className="p-4 border-b border-[hsl(var(--border))] font-semibold bg-gray-50 dark:bg-gray-800/50">
              Select Program / Skill
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1" role="listbox" aria-label="Available Programs and Skills">
              {entities.map((e: any) => (
                <button
                  key={`${e.type}-${e.id}`}
                  onClick={() => loadForm(e)}
                  role="option"
                  aria-selected={selected?.id === e.id && selected?.type === e.type}
                  className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors ${
                    selected?.id === e.id && selected?.type === e.type
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                  }`}
                >
                  <div className="font-medium truncate">{e.title}</div>
                  <div
                    className={`text-[10px] uppercase font-bold ${
                      selected?.id === e.id && selected?.type === e.type
                        ? "text-white/80"
                        : "text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {e.type}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <div className="card min-h-[calc(100vh-16rem)]">
              <div className="card-body">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">{selected.title}</h2>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Editing {selected.type} registration form
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {message && (
                      <span
                        className="text-sm font-medium text-brand-primary animate-in fade-in slide-in-from-right-1"
                        role="status"
                        aria-live="polite"
                      >
                        {message}
                      </span>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving || loading}
                      className="btn-primary"
                      aria-label={saving ? "Saving form..." : "Save Form"}
                    >
                      {saving ? "Saving..." : "Save Form"}
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="py-20 text-center text-[hsl(var(--muted-foreground))]">
                    Loading form content...
                  </div>
                ) : schema ? (
                  <div className="border rounded-xl p-6 bg-gray-50/50 dark:bg-gray-900/20">
                    <FormBuilder initial={schema} onChange={setSchema} />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center text-[hsl(var(--muted-foreground))] py-40">
              Select a program or skill from the left to start editing its form.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
