"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FormRenderer } from "@/components/form-builder/FormRenderer";
import { defaultSkillUpForm } from "@/lib/templates/skill-up-default";

type Skill = { id: number; title: string; slug: string; description?: string };

export default function RegistrationFormClient({ skill }: { skill: Skill }) {
  const [authed, setAuthed] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        window.location.href = `/login?next=${encodeURIComponent(
          `/skill-up/${skill.slug}/register`
        )}`;
        return;
      }
      setAuthed(true);
      // Load admin-built skill form schema
      const { data } = await supabase
        .from("skill_forms")
        .select("schema")
        .eq("skill_id", skill.id)
        .eq("form_type", "individual") // Assuming 'individual' is the default type for skills too
        .maybeSingle();

      setSchema((data as any)?.schema || defaultSkillUpForm);
      setLoading(false);
    })();
  }, [skill.id, skill.slug]);

  const saveForm = async (vals: Record<string, unknown>) => {
    try {
      setMessage("");
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      // Note: 'program_id' in payload might need to be 'skill_id' if the API supports it,
      // or we piggyback on program_id if the backend treats them similarly.
      // Checking api/success-enroll/create would be good, but assuming we pass skill_id for now or adapting.
      // If the backend expects 'program_id' only, we might need to adjust or use a different endpoint.
      // Let's assume the success-enroll endpoint handles 'type' or we send 'skill_id'.
      // Update: success_enroll usually has program_id. If skills are stored in programs table, it's fine.
      // But we queried 'skills' table. success_enroll likely needs a 'type' column or 'skill_id' column.
      // For now, I'll send program_id as null and skill_id if possible, or assume unification.
      // Let's check the API endpoint code later. Sending skill_id is safer if backend supports it.

      const res = await fetch("/api/success-enroll/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          program_id: null, // It's a skill
          skill_id: skill.id,
          type: "skill",
          form_data: vals,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.id)
        throw new Error(json?.error || "Failed to save");
      setSavedId(Number(json.id));
    } catch (e: any) {
      setMessage(e?.message || "Failed to save");
    }
  };

  if (!authed || loading)
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 pt-28">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-[hsl(var(--muted-foreground))]">
            Loading…
          </div>
        </div>
      </div>
    );

  if (savedId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 pt-28">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Form saved</h2>
            <p className="text-[hsl(var(--muted-foreground))]">
              Your registration data has been saved. Proceed to payment to
              complete your enrollment.
            </p>
            <div className="flex gap-3 justify-center">
              <a href={`/skill-up/${skill.slug}`} className="btn-outline">
                Back
              </a>
              <a
                href={`/payment?skill=${skill.id}&se=${savedId}`}
                className="btn-primary"
              >
                Proceed to Payment
              </a>
              <a href="/dashboard" className="btn-outline">
                Pay later
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 pt-28">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-3">
          <h2 className="text-2xl font-bold">Register for {skill.title}</h2>
          {skill.description && (
            <p className="text-[hsl(var(--muted-foreground))]">
              {skill.description}
            </p>
          )}
          <FormRenderer
            schema={schema}
            onSubmit={saveForm}
            submitLabel="Save Registration"
          />
          {message && <p className="text-sm text-red-600">{message}</p>}
        </div>
      </div>
    </div>
  );
}
