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
      
      // Load plans
      const { data: plansData } = await supabase
        .from('pricing_plans')
        .select('price, currency, subscription_type')
        .eq('entity_type', 'skill')
        .eq('entity_id', skill.id);
      setPlans(plansData || []);
      if (plansData?.length) setSelectedPlan(plansData[0]);

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

  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const saveForm = async (vals: Record<string, unknown>) => {
    try {
      setMessage("");
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      
      const res = await fetch("/api/enrollment/create", {
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
          subscription_type: selectedPlan?.subscription_type
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
                href={`/payment?skill=${skill.id}&enrollment_id=${savedId}`}
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

          {plans.length > 0 && (
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 my-4 space-y-2">
              <h3 className="text-sm font-semibold text-blue-900">Choose Pricing Plan:</h3>
              <div className="flex flex-wrap gap-3">
                {plans.map((p, idx) => (
                  <label key={idx} className={`flex-1 min-w-[140px] cursor-pointer rounded-md border p-3 transition-all ${
                    selectedPlan?.subscription_type === p.subscription_type 
                      ? 'border-brand-primary bg-white shadow-sm ring-1 ring-brand-primary' 
                      : 'border-gray-200 bg-gray-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="plan" 
                      className="hidden" 
                      checked={selectedPlan?.subscription_type === p.subscription_type}
                      onChange={() => setSelectedPlan(p)}
                    />
                    <div className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">{p.subscription_type}</div>
                    <div className="text-lg font-bold">{p.currency} {p.price.toLocaleString()}</div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <FormRenderer
            schema={schema}
            onSubmit={saveForm}
            submitLabel="Save & Proceed"
          />
          {message && <p className="text-sm text-red-600">{message}</p>}
        </div>
      </div>
    </div>
  );
}
