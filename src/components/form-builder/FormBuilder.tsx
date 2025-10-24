"use client";

import React, { useEffect, useMemo, useState } from "react";
import gsap from "gsap";
import type { IconType } from "react-icons";
import {
  FiType,
  FiMail,
  FiPhone,
  FiFileText,
  FiList,
  FiCheckSquare,
  FiCircle,
  FiCalendar,
  FiHash,
  FiTrash2,
  FiAlertCircle,
  FiMove,
  FiBold,
  FiItalic,
  FiLayout,
  FiUpload,
  FiClock,
} from "react-icons/fi";

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "date"
  | "time"
  | "datetime"
  | "datetime-local"
  | "number"
  | "section"
  | "file";

export interface FieldStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface FormFieldDef {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  style?: FieldStyle; // visual styles for label/description when rendered
  options?: string[]; // for select/radio/checkbox
}

export interface FormSchema {
  title: string;
  description?: string;
  fields: FormFieldDef[];
}

const TYPE_META: Record<
  FieldType,
  { label: string; icon: IconType; tint: string; badge: string }
> = {
  text: {
    label: "Short text",
    icon: FiType,
    tint: "from-sky-500/15 to-sky-500/5 text-sky-700 dark:text-sky-300",
    badge:
      "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200/60 dark:ring-sky-400/30",
  },
  email: {
    label: "Email",
    icon: FiMail,
    tint: "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    badge:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/60 dark:ring-emerald-400/30",
  },
  tel: {
    label: "Phone",
    icon: FiPhone,
    tint: "from-indigo-500/15 to-indigo-500/5 text-indigo-700 dark:text-indigo-300",
    badge:
      "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200/60 dark:ring-indigo-400/30",
  },
  textarea: {
    label: "Long text",
    icon: FiFileText,
    tint: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-700 dark:text-fuchsia-300",
    badge:
      "bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 ring-1 ring-fuchsia-200/60 dark:ring-fuchsia-400/30",
  },
  select: {
    label: "Dropdown",
    icon: FiList,
    tint: "from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-300",
    badge:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200/60 dark:ring-amber-400/30",
  },
  checkbox: {
    label: "Checkboxes",
    icon: FiCheckSquare,
    tint: "from-rose-500/15 to-rose-500/5 text-rose-700 dark:text-rose-300",
    badge:
      "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200/60 dark:ring-rose-400/30",
  },
  radio: {
    label: "Radio",
    icon: FiCircle,
    tint: "from-cyan-500/15 to-cyan-500/5 text-cyan-700 dark:text-cyan-300",
    badge:
      "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-200/60 dark:ring-cyan-400/30",
  },
  date: {
    label: "Date",
    icon: FiCalendar,
    tint: "from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-300",
    badge:
      "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200/60 dark:ring-violet-400/30",
  },
  number: {
    label: "Number",
    icon: FiHash,
    tint: "from-teal-500/15 to-teal-500/5 text-teal-700 dark:text-teal-300",
    badge:
      "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-200/60 dark:ring-teal-400/30",
  },
  time: {
    label: "Time",
    icon: FiClock,
    tint: "from-blue-500/15 to-blue-500/5 text-blue-700 dark:text-blue-300",
    badge:
      "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/60 dark:ring-blue-400/30",
  },
  datetime: {
    label: "Date & time",
    icon: FiClock,
    tint: "from-purple-500/15 to-purple-500/5 text-purple-700 dark:text-purple-300",
    badge:
      "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-purple-200/60 dark:ring-purple-400/30",
  },
  "datetime-local": {
    label: "Date & time (local)",
    icon: FiClock,
    tint: "from-orange-500/15 to-orange-500/5 text-orange-700 dark:text-orange-300",
    badge:
      "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-200/60 dark:ring-orange-400/30",
  },
  section: {
    label: "Section",
    icon: FiLayout,
    tint: "from-slate-500/15 to-slate-500/5 text-slate-700 dark:text-slate-300",
    badge:
      "bg-slate-50 dark:bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200/60 dark:ring-slate-400/30",
  },
  file: {
    label: "File upload",
    icon: FiUpload,
    tint: "from-lime-500/15 to-lime-500/5 text-lime-700 dark:text-lime-300",
    badge:
      "bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-300 ring-1 ring-lime-200/60 dark:ring-lime-400/30",
  },
};

export const FormBuilder: React.FC<{
  initial?: FormSchema;
  onChange: (schema: FormSchema) => void;
}> = ({ initial, onChange }) => {
  const [schema, setSchema] = useState<FormSchema>(
    initial || { title: "", fields: [] }
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const types = useMemo(
    () =>
      [
        "text",
        "email",
        "tel",
        "textarea",
        "select",
        "checkbox",
        "radio",
        "date",
        "time",
        "datetime",
        "datetime-local",
        "number",
        "section",
        "file",
      ] as FieldType[],
    []
  );

  const addField = (type: FieldType) => {
    const newField: FormFieldDef = {
      id: `${Date.now()}`,
      label: "", // start blank; use placeholder in UI like Google Forms
      type,
      required: false,
      style: {},
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? [] : undefined,
    };
    const next = { ...schema, fields: [...schema.fields, newField] };
    setSchema(next);
    onChange(next);
  };

  const moveField = (from: number, to: number) => {
    if (from === to) return;
    const arr = [...schema.fields];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    const next = { ...schema, fields: arr };
    setSchema(next);
    onChange(next);
  };

  const updateField = (id: string, patch: Partial<FormFieldDef>) => {
    const next = {
      ...schema,
      fields: schema.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    };
    setSchema(next);
    onChange(next);
  };

  const removeField = (id: string) => {
    const next = { ...schema, fields: schema.fields.filter((f) => f.id !== id) };
    setSchema(next);
    onChange(next);
  };

  // Entrance animation (no opacity to avoid any lingering "faded" look)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".fb-field", {
        y: 8,
        duration: 0.35,
        ease: "power2.out",
        stagger: 0.04,
      });
    });
    return () => ctx.revert();
  }, [schema.fields.length]);

  // Ensure first item is a section
  useEffect(() => {
    if (!schema.fields.length || schema.fields[0].type !== "section") {
      const section: FormFieldDef = { id: `${Date.now()}-sec`, label: "", type: "section", required: false };
      const next = { ...schema, fields: [section, ...schema.fields] };
      setSchema(next);
      onChange(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isAddingDrag, setIsAddingDrag] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Main editor */}
      <div
        className="md:col-span-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"
        onDragOver={(e) => {
          if (isAddingDrag) e.preventDefault();
        }}
        onDrop={(e) => {
          const t = e.dataTransfer.getData("text/plain") as FieldType;
          setIsAddingDrag(false);
          if (t && TYPE_META[t]) {
            addField(t);
          }
        }}
      >
        <div className="relative p-6 rounded-t-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--ring))] text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white_0%,transparent_35%),radial-gradient(circle_at_80%_0%,white_0%,transparent_30%)]" />
          <div className="relative z-10">
            <input
              aria-label="Form title"
              className="w-full bg-transparent text-2xl md:text-3xl font-extrabold tracking-tight outline-none placeholder:text-white/70 text-white drop-shadow"
              placeholder="Form title"
              value={schema.title}
              onChange={(e) => {
                const next = { ...schema, title: e.target.value };
                setSchema(next);
                onChange(next);
              }}
            />
            <textarea
              aria-label="Form description"
              className="mt-2 w-full rounded-md border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-2 text-sm text-white placeholder:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              placeholder="Describe this form (optional)"
              value={schema.description || ""}
              onChange={(e) => {
                const next = { ...schema, description: e.target.value };
                setSchema(next);
                onChange(next);
              }}
            />
          </div>
        </div>

        <div className="p-5 space-y-4">
          {schema.fields.length === 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-[hsl(var(--border))] p-5 text-[hsl(var(--muted-foreground))]">
              <FiAlertCircle className="shrink-0" />
              <p className="text-sm">No fields yet — drag a field from the right or click to add.</p>
            </div>
          )}

          {isAddingDrag && (
            <div className="rounded-lg border-2 border-dashed border-[hsl(var(--primary))] bg-[hsl(var(--muted))] p-6 text-center text-[hsl(var(--muted-foreground))]">
              Drop here to add a field
            </div>
          )}

          {schema.fields.map((f, idx) => {
            const Meta = TYPE_META[f.type];
            if (!Meta) {
              console.error(`Unknown field type: ${f.type}`);
              // Return a fallback UI for unknown field types instead of null
              return (
                <div
                  key={f.id}
                  className="fb-field group rounded-xl border border-red-200 bg-red-50 shadow-sm p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-red-700">
                      <FiAlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Unknown field type: {f.type}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(f.id)}
                      className="inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-1.5 text-red-700 hover:bg-red-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label="Remove invalid field"
                      title="Remove"
                    >
                      <FiTrash2 />
                      <span className="text-sm">Remove</span>
                    </button>
                  </div>
                </div>
              );
            }
            const BadgeIcon = Meta.icon;
            const isSection = f.type === "section";
            return (
              <div
                key={f.id}
                className="fb-field group rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm transition hover:shadow-md"
                onDragOver={(e) => {
                  if (dragIndex !== null) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) {
                    moveField(dragIndex, idx);
                    setDragIndex(null);
                  }
                }}
              >
                {/* Field header */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 bg-gradient-to-b ${Meta.tint}`}>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${Meta.badge}`}>
                      <BadgeIcon className="h-3.5 w-3.5" />
                      <span>{Meta.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] cursor-grab active:cursor-grabbing"
                      aria-label="Drag to reorder"
                      title="Drag to reorder"
                    >
                      <FiMove />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField(f.id)}
                      className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                      aria-label="Remove field"
                      title="Remove"
                    >
                      <FiTrash2 />
                      <span className="text-sm">Remove</span>
                    </button>
                  </div>
                </div>

                {/* Field body */}
                <div className="px-4 py-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <input
                      className="flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                      placeholder={isSection ? "Section title" : "Question"}
                      value={f.label}
                      onChange={(e) => updateField(f.id, { label: e.target.value })}
                    />

                    {!isSection && (
                      <select
                        className="w-full md:w-56 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-[hsl(var(--foreground))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                        value={f.type}
                        onChange={(e) => updateField(f.id, { type: e.target.value as FieldType })}
                        aria-label="Field type"
                        title="Field type"
                      >
                        {types.filter((t) => t !== "section").map((t) => {
                          const Meta = TYPE_META[t];
                          if (!Meta) return null; // Skip unknown types
                          return (
                            <option key={t} value={t}>
                              {Meta.label}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  {/* Style toolbar */}
                  {!isSection && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Label style:</span>
                      <button
                        type="button"
                        onClick={() => updateField(f.id, { style: { ...f.style, bold: !f.style?.bold } })}
                        className={`inline-flex items-center rounded-md border px-2 py-1 text-xs ${f.style?.bold ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-transparent" : "border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"}`}
                        title="Bold"
                      >
                        <FiBold />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField(f.id, { style: { ...f.style, italic: !f.style?.italic } })}
                        className={`inline-flex items-center rounded-md border px-2 py-1 text-xs ${f.style?.italic ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-transparent" : "border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"}`}
                        title="Italic"
                      >
                        <FiItalic />
                      </button>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      {isSection ? "Section description" : "Field description (optional)"}
                    </label>
                    <textarea
                      className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] min-h-[72px]"
                      placeholder={isSection ? "Describe this section" : "Add guidance for the user"}
                      value={f.description || ""}
                      onChange={(e) => updateField(f.id, { description: e.target.value })}
                    />
                  </div>


                  {/* Options editor (Google Forms style) */}
                  {!isSection && (f.type === "select" || f.type === "radio" || f.type === "checkbox") && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">
                        Options
                      </label>
                      <div className="space-y-2">
                        {(() => {
                          const opts = Array.isArray(f.options) ? f.options : [];
                          // Ensure there is one trailing empty input
                          const rows = [...opts, ""];
                          return rows.map((val, i) => (
                            <div key={i} className={`flex items-center gap-2 ${val ? '' : 'opacity-70'}`}>
                              {/* faded control icon */}
                              <span className={`inline-block h-4 w-4 rounded-full border ${val ? 'border-[hsl(var(--foreground))]' : 'border-[hsl(var(--muted-foreground))]'}`} />
                              <input
                                className="flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-1.5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                                placeholder={`Option ${i + 1}`}
                                value={val}
                                onChange={(e) => {
                                  const next = [...opts];
                                  const v = e.target.value;
                                  if (i < opts.length) {
                                    next[i] = v;
                                  } else if (v.trim()) {
                                    next.push(v);
                                  }
                                  // Remove empty options except the trailing one
                                  const cleaned = next.filter((s) => s.trim() !== "");
                                  updateField(f.id, { options: cleaned });
                                }}
                              />
                              {val && (
                                <button type="button" className="btn-ghost text-xs" onClick={() => {
                                  const next = (f.options || []).filter((_, idx) => idx !== i);
                                  updateField(f.id, { options: next });
                                }}>Remove</button>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Required toggle (not for sections) */}
                  {!isSection && (
                    <div className="flex items-center justify-between pt-1">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateField(f.id, { required: !f.required })}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                            f.required
                              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-transparent"
                              : "border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                          }`}
                          aria-pressed={!!f.required}
                        >
                          <span className="h-2.5 w-2.5 rounded-full bg-current opacity-70" />
                          Required
                        </button>
                      </div>

                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Field ID: {f.id}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add field modal trigger */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm p-4 md:p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[hsl(var(--card-foreground))]">Add field</h3>
          <button type="button" onClick={() => setShowPicker(true)} className="btn-primary">Open Picker</button>
        </div>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Click to choose a field type, or drag from the picker onto the form.</p>
      </div>

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPicker(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Choose a field type</h4>
              <button type="button" className="btn-ghost" onClick={() => setShowPicker(false)}>Close</button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {types.map((t) => {
                const Meta = TYPE_META[t];
                if (!Meta) {
                  console.error(`Unknown field type in picker: ${t}`);
                  return null; // Skip unknown types in picker
                }
                const Icon = Meta.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { addField(t); setShowPicker(false); }}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", t); setIsAddingDrag(true); }}
                    onDragEnd={() => setIsAddingDrag(false)}
                    className={`group flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] px-3 h-12 text-left hover:bg-[hsl(var(--muted))] transition`}
                  >
                    <span className={`grid h-8 w-8 place-items-center rounded-md ${Meta.badge}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">{Meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
