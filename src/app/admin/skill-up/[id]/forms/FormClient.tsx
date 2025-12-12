"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FormBuilder, FormSchema } from "@/components/form-builder/FormBuilder";
import { defaultSkillUpForm } from "@/lib/templates/skill-up-default";

export function SkillFormsClient({ skillId }: { skillId: number }) {
  const [active] = useState<'individual'>("individual");
  const [schema, setSchema] = useState<FormSchema>({ title: "Registration Form", fields: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    // Fetch skill title to keep schema title aligned
    const { data: skill } = await supabase.from('skills').select('title').eq('id', skillId).maybeSingle();
    const skillTitle = (skill as any)?.title as string | undefined;

    const { data } = await supabase
      .from("skill_forms")
      .select("id, schema")
      .eq("skill_id", skillId)
      .eq("form_type", 'individual')
      .maybeSingle();

    let next = (data?.schema as FormSchema) || defaultSkillUpForm;

    if (skillTitle) {
      const desired = `Register for ${skillTitle}`;
      if (!next.title || next.title !== desired) next = { ...next, title: desired };
    }
    setSchema(next);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, skillId]);

  const handleSave = async () => {
    setMessage("");
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      const res = await fetch('/api/admin/forms/upsert', {
        method: 'POST', 
        headers: { 'content-type': 'application/json', ...(token ? { 'authorization': `Bearer ${token}` } : {}) }, 
        body: JSON.stringify({ scope: 'skill', id: skillId, form_type: 'individual', schema })
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
          <h2 className="text-xl font-bold mb-1">Skill Form Builder</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Create and manage the registration form for this skill.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="mb-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Editing the Registration form.</p>
          </div>

          <div className="card border border-[hsl(var(--border))]">
            <div className="card-body">
              {loading ? (
                <p className="text-[hsl(var(--muted-foreground))]">Loading form schema…</p>
              ) : (
                <FormBuilder initial={schema} onChange={setSchema} />
              )}
              <div className="mt-4 flex items-center gap-3" aria-live="polite">
                <button onClick={handleSave} className="btn-primary" aria-label="Save form">Save Form</button>
                {message && <span className="text-sm text-[hsl(var(--muted-foreground))]" role="status">{message}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
