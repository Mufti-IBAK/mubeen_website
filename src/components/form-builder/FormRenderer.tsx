import React, { useMemo, useState } from "react";
import type { FormSchema } from "./FormBuilder";

type RendererProps = {
  schema: FormSchema;
  onSubmit: (vals: Record<string, unknown>) => void;
  onSaveDraft?: (vals: Record<string, unknown>) => void; // optional Save & Continue Later
  onChange?: (vals: Record<string, unknown>) => void;
  initialValues?: Record<string, any>;
  disabled?: boolean;
};

export const FormRenderer: React.FC<RendererProps> = ({ schema, onSubmit, onSaveDraft, onChange, initialValues, disabled }) => {
  const formRef = React.useRef<HTMLFormElement>(null);
  const collect = (): Record<string, unknown> => {
    const form = formRef.current;
    const out: Record<string, unknown> = {};
    if (!form) return out;
    const fd = new FormData(form);
    for (const [k, v] of fd.entries()) {
      if (Object.prototype.hasOwnProperty.call(out, k)) {
        const prev = out[k];
        out[k] = Array.isArray(prev) ? [...prev as any[], v] : [prev, v];
      } else {
        out[k] = v;
      }
    }
    return out;
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(collect());
  };

  const labelClass = (f: { style?: { bold?: boolean; italic?: boolean; underline?: boolean } }) => {
    const base = "block text-sm mb-1 text-[hsl(var(--foreground))]";
    const bold = f.style?.bold ? " font-semibold" : "";
    const italic = f.style?.italic ? " italic" : "";
    const underline = f.style?.underline ? " underline" : "";
    return base + bold + italic + underline;
  };

  // Group fields into sections (like Google Forms)
  const sections = useMemo(() => {
    const out: { id: string; title: string; description?: string; fields: any[] }[] = [];
    let current: { id: string; title: string; description?: string; fields: any[] } | null = null;
    for (const f of schema.fields) {
      if (f.type === "section") {
        current = { id: f.id, title: f.label, description: f.description, fields: [] };
        out.push(current);
      } else {
        if (!current) {
          current = { id: `section-auto`, title: schema.title || "Section", fields: [] };
          out.push(current);
        }
        current.fields.push(f);
      }
    }
    return out;
  }, [schema.fields, schema.title]);

  const [idx, setIdx] = useState(0);
  const atStart = idx === 0;
  const atEnd = idx === Math.max(sections.length - 1, 0);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">{schema.title}</h2>
        {schema.description && (
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{schema.description}</p>
        )}
      </div>

      {sections.map((sec, sIdx) => (
        <div key={sec.id} style={{ display: sIdx === idx ? "block" : "none" }}>
          <div className="pt-2">
            <h3 className="text-xl font-semibold text-[hsl(var(--foreground))]">{sec.title}</h3>
            {sec.description && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{sec.description}</p>}
          </div>

          <div className="mt-4 space-y-4">
            {sec.fields.map((f) => {
              const iv = initialValues || {};
              const v = iv[f.id];
              const inputId = `fr-${f.id}`;
              return (
                <div key={f.id}>
                  <label className={labelClass(f)} htmlFor={inputId}>
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  {f.description && <p className="-mt-1 mb-2 text-xs text-[hsl(var(--muted-foreground))]">{f.description}</p>}

                  {f.type === "textarea" ? (
                    <textarea id={inputId} name={f.id} required={!!f.required} disabled={!!disabled} defaultValue={typeof v === 'string' ? v : ''} onChange={() => onChange?.(collect())} className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-[hsl(var(--foreground))]" />
                  ) : f.type === "select" ? (
                    <select id={inputId} name={f.id} required={!!f.required} disabled={!!disabled} defaultValue={typeof v === 'string' ? v : ''} onChange={() => onChange?.(collect())} className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-[hsl(var(--foreground))]">
                      <option value="">Select...</option>
                      {(f.options || []).map((o: string) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === "checkbox" || f.type === "radio" ? (
                    <div className="flex gap-3 flex-wrap">
                      {(f.options || []).map((o: string) => (
                        <label key={o} className="flex items-center gap-2 text-[hsl(var(--foreground))]">
                          <input type={f.type} name={f.id} value={o} disabled={!!disabled} defaultChecked={Array.isArray(v) ? v.includes(o) : v === o} onChange={() => onChange?.(collect())} />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  ) : f.type === "file" ? (
                    <input id={inputId} type="file" name={f.id} required={!!f.required} disabled={!!disabled} onChange={() => onChange?.(collect())} className="block w-full text-[hsl(var(--foreground))]" />
                  ) : f.type === "datetime" || f.type === "datetime-local" ? (
                    <input id={inputId} type="datetime-local" name={f.id} required={!!f.required} disabled={!!disabled} defaultValue={typeof v === 'string' ? v : ''} onChange={() => onChange?.(collect())} className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-[hsl(var(--foreground))]" />
                  ) : f.type === "time" ? (
                    <input id={inputId} type="time" name={f.id} required={!!f.required} disabled={!!disabled} defaultValue={typeof v === 'string' ? v : ''} onChange={() => onChange?.(collect())} className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-[hsl(var(--foreground))]" />
                  ) : (
                    <input id={inputId} type={f.type} name={f.id} required={!!f.required} disabled={!!disabled} defaultValue={typeof v === 'string' || typeof v === 'number' ? String(v) : ''} onChange={() => onChange?.(collect())} className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-[hsl(var(--foreground))]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <button type="button" disabled={atStart} onClick={() => setIdx((v) => Math.max(0, v - 1))} className="btn-outline disabled:opacity-50">Back</button>
          {onSaveDraft && (
            <button type="button" className="btn-outline" onClick={(e) => {
              const fd = new FormData((e.currentTarget as HTMLButtonElement).form!);
              const vals: Record<string, unknown> = {};
              for (const [k, v] of fd.entries()) vals[k] = v;
              onSaveDraft(vals);
            }}>Save & Continue Later</button>
          )}
        </div>
        {atEnd ? (
          <button type="submit" className="btn-primary">Submit</button>
        ) : (
          <button type="button" onClick={() => setIdx((v) => Math.min(sections.length - 1, v + 1))} className="btn-primary">Next</button>
        )}
      </div>
    </form>
  );
};

