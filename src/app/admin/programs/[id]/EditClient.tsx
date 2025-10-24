"use client";

import React from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AdminProgramsEditClient({ programId }: { programId: number }) {
  const id = programId;
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState("");
  const [form, setForm] = React.useState({
    title: "",
    slug: "",
    description: "",
    image_url: "",
    duration: "",
    tags: "",
    is_flagship: false,
    overview: "",
    prerequisites: "",
    level: "",
    language: "",
    outcomes: "",           // comma-separated for UI
    start_date: "",
    enrollment_deadline: "",
  });
  // Guided editors state
  type Instructor = { name: string; title?: string; avatar_url?: string };
  type Faq = { q: string; a: string };
  type SItem = { title: string; when: string; description?: string };
  const [instructorsArr, setInstructorsArr] = React.useState<Instructor[]>([]);
  const [faqsArr, setFaqsArr] = React.useState<Faq[]>([]);
  const [scheduleItems, setScheduleItems] = React.useState<SItem[]>([]);
  const [uploadMsg, setUploadMsg] = React.useState("");

  React.useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("programs").select("*").eq("id", id).single();
      if (data) {
        setForm({
          title: data.title || "",
          slug: data.slug || "",
          description: data.description || "",
          image_url: data.image_url || "",
          duration: data.duration || "",
          tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
          is_flagship: !!data.is_flagship,
          overview: data.overview || "",
          prerequisites: data.prerequisites || "",
          level: data.level || "",
          language: data.language || "",
          outcomes: Array.isArray(data.outcomes) ? data.outcomes.join(", ") : "",
          start_date: data.start_date || "",
          enrollment_deadline: data.enrollment_deadline || "",
        });
        // Parse guided editor fields
        try {
          const instr = Array.isArray(data.instructors) ? data.instructors : [];
          setInstructorsArr(instr.map((i: any) => ({ name: i.name || '', title: i.title || i.role || '', avatar_url: i.avatar_url || i.image || '' }))); 
        } catch { setInstructorsArr([]); }
        try {
          const fs = Array.isArray(data.faqs) ? data.faqs : [];
          setFaqsArr(fs.map((f: any) => ({ q: f.q || f.question || '', a: f.a || f.answer || '' })));
        } catch { setFaqsArr([]); }
        try {
          const sch = data.schedule;
          const items = Array.isArray(sch?.items) ? sch.items : (Array.isArray(sch) ? sch : []);
          setScheduleItems(items.map((it: any) => ({ title: it.title || it.name || '', when: it.when || it.date || '', description: it.description || it.desc || '' })));
        } catch { setScheduleItems([]); }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const uploadToBucket = async (file: File) => {
    const path = `${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('program-images').upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('program-images').getPublicUrl(path);
    return data.publicUrl as string;
  };

  const save: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault(); setMessage(""); setUploadMsg("");
    const fd = new FormData(e.currentTarget);
    let image_url = form.image_url?.trim() || '';
    const file = fd.get('image') as File | null;
    try {
      if (file && file.size > 0) {
        setUploadMsg('Uploading image...');
        image_url = await uploadToBucket(file);
        setUploadMsg('');
      }
    } catch (err: any) {
      setUploadMsg(err.message || 'Upload failed');
      return;
    }

    const instructors = instructorsArr.filter(i => i.name.trim() !== '');
    const faqs = faqsArr.filter(f => f.q.trim() && f.a.trim());
    const schedule = { items: scheduleItems.filter(s => s.title.trim() && s.when.trim()) };

    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description,
      image_url,
      duration: form.duration,
      tags: form.tags ? form.tags.split(",").map(s => s.trim()).filter(Boolean) : null,
      is_flagship: form.is_flagship,
      overview: form.overview || null,
      prerequisites: form.prerequisites || null,
      level: form.level || null,
      language: form.language || null,
      outcomes: form.outcomes ? form.outcomes.split(',').map(s => s.trim()).filter(Boolean) : null,
      instructors,
      faqs,
      schedule,
      start_date: form.start_date || null,
      enrollment_deadline: form.enrollment_deadline || null,
    };

    // Include Supabase access token so API route can verify admin
    const { data: sessionRes } = await supabase.auth.getSession();
    const accessToken = sessionRes.session?.access_token;

    const res = await fetch(`/api/admin/programs/${id}/update`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setMessage(res.ok && json?.ok ? 'Saved' : (json?.error || 'Failed to save'));
  };

  // Pricing & Plans state
  const [plans, setPlans] = React.useState<Array<{ id?: number; plan_type: 'individual'|'family'; family_size: number|null; price: string; currency: string; duration_months: string }>>([
    { plan_type: 'individual', family_size: null, price: '', currency: 'NGN', duration_months: '3' },
    { plan_type: 'family', family_size: 2, price: '', currency: 'NGN', duration_months: '3' },
    { plan_type: 'family', family_size: 3, price: '', currency: 'NGN', duration_months: '3' },
    { plan_type: 'family', family_size: 4, price: '', currency: 'NGN', duration_months: '3' },
  ]);
  const [plansMsg, setPlansMsg] = React.useState('');

  React.useEffect(() => {
    const loadPlans = async () => {
      const { data } = await supabase.from('program_plans').select('*').eq('program_id', id).order('family_size', { ascending: true });
      if (data && Array.isArray(data)) {
        const next = [...plans];
        data.forEach((p: any) => {
          const idx = next.findIndex(x => x.plan_type === p.plan_type && (x.family_size ?? null) === (p.family_size ?? null));
          const rec = { id: p.id, plan_type: p.plan_type, family_size: p.family_size, price: String(p.price ?? ''), currency: p.currency ?? 'NGN', duration_months: String(p.duration_months ?? '3') };
          if (idx >= 0) next[idx] = rec; else next.push(rec);
        });
        setPlans(next);
      }
    };
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const savePlans = async () => {
    setPlansMsg('');
    const payload = plans
      .filter(p => p.price)
      .map(p => ({
        program_id: id,
        plan_type: p.plan_type,
        family_size: p.family_size,
        price: Number(p.price),
        currency: p.currency || 'NGN',
        duration_months: Number(p.duration_months || '3'),
      }));
    if (payload.length === 0) { setPlansMsg('Nothing to save'); return; }

    // Split into individual (family_size null) and family entries (family_size not null)
    const indiv = payload.find(p => p.plan_type === 'individual' && (p.family_size === null || typeof p.family_size === 'undefined'));
    const families = payload.filter(p => p.plan_type === 'family' && p.family_size !== null && typeof p.family_size !== 'undefined');

    try {
      // Upsert families using unique (program_id, plan_type, family_size)
      if (families.length) {
        const { error: famErr } = await supabase
          .from('program_plans')
          .upsert(families, { onConflict: 'program_id,plan_type,family_size' });
        if (famErr) throw famErr;
      }

      // For the individual plan (family_size null), ON CONFLICT won't match NULL.
      // So we update if exists, else insert.
      if (indiv) {
        const { data: existing } = await supabase
          .from('program_plans')
          .select('id')
          .eq('program_id', id)
          .eq('plan_type', 'individual')
          .is('family_size', null)
          .single();
        if (existing?.id) {
          const { error: updErr } = await supabase
            .from('program_plans')
            .update({ price: indiv.price, currency: indiv.currency, duration_months: indiv.duration_months })
            .eq('id', existing.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('program_plans')
            .insert({ program_id: id, plan_type: 'individual', family_size: null, price: indiv.price, currency: indiv.currency, duration_months: indiv.duration_months });
          if (insErr) throw insErr;
        }
      }

      setPlansMsg('Plans saved');
    } catch (e: any) {
      setPlansMsg(e?.message || 'Failed to save plans');
    }
  };

  if (loading) return <p className="text-[hsl(var(--muted-foreground))]">Loading...</p>;

  return (
    <div className="space-y-6">
      {/* Next Steps CTA */}
      <div className="card">
        <div className="card-body flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Next steps</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Configure pricing and build the registration forms for this program.</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/programs/${id}/forms`} className="btn-outline">Build Forms</Link>
            <a href="#pricing" className="btn-primary">Configure Pricing</a>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Program</h1>
        <Link href="/admin/programs">Back</Link>
      </div>
      <form onSubmit={save} className="card grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
          <div>
            <label className="block text-sm mb-1" htmlFor="title">Title</label>
            <input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="input" />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="slug">Slug</label>
            <input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1" htmlFor="description">Description</label>
            <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="textarea" rows={4} />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="image">Upload Cover</label>
            <input id="image" name="image" type="file" className="input" />
            {uploadMsg && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{uploadMsg}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="image_url">Or Image URL</label>
            <input id="image_url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="duration">Duration</label>
            <input id="duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1" htmlFor="tags">Tags (comma-separated)</label>
            <input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input" />
          </div>
          <div className="flex items-center gap-2">
            <input id="flagship3" type="checkbox" checked={form.is_flagship} onChange={(e) => setForm({ ...form, is_flagship: e.target.checked })} />
            <label htmlFor="flagship3">Flagship Program</label>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">Save</button>
            {message && <span className="ml-3 text-sm text-[hsl(var(--muted-foreground))]">{message}</span>}
          </div>
        </div>
      </form>

      {/* Rich Program Content */}
      <div className="card">
        <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="overview">Overview</label>
            <textarea id="overview" value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} className="textarea" rows={4} />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="prerequisites">Prerequisites</label>
            <textarea id="prerequisites" value={form.prerequisites} onChange={(e) => setForm({ ...form, prerequisites: e.target.value })} className="textarea" rows={4} />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="level">Level</label>
            <input id="level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="input" />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="language">Language</label>
            <input id="language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="input" />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="outcomes">Outcomes (comma-separated)</label>
            <input id="outcomes" value={form.outcomes} onChange={(e) => setForm({ ...form, outcomes: e.target.value })} className="input" />
          </div>

          {/* Instructors editor */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm">Instructors</label>
              <button type="button" className="btn-outline" onClick={() => setInstructorsArr(prev => [...prev, { name: '', title: '', avatar_url: '' }])}>Add Instructor</button>
            </div>
            <div className="space-y-3">
              {instructorsArr.map((ins, idx) => (
                <div key={idx} className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input className="input" placeholder="Name" value={ins.name} onChange={e => { const next=[...instructorsArr]; next[idx] = { ...ins, name: e.target.value }; setInstructorsArr(next); }} />
                  <input className="input" placeholder="Title / Role" value={ins.title || ''} onChange={e => { const next=[...instructorsArr]; next[idx] = { ...ins, title: e.target.value }; setInstructorsArr(next); }} />
                  <div className="flex gap-2">
                    <input className="input flex-1" placeholder="Avatar URL" value={ins.avatar_url || ''} onChange={e => { const next=[...instructorsArr]; next[idx] = { ...ins, avatar_url: e.target.value }; setInstructorsArr(next); }} />
                    <button type="button" className="btn-destructive" onClick={() => setInstructorsArr(prev => prev.filter((_,i) => i!==idx))}>Remove</button>
                  </div>
                </div>
              ))}
              {instructorsArr.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">No instructors yet.</p>}
            </div>
          </div>

          {/* FAQs editor */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm">FAQs</label>
              <button type="button" className="btn-outline" onClick={() => setFaqsArr(prev => [...prev, { q: '', a: '' }])}>Add FAQ</button>
            </div>
            <div className="space-y-3">
              {faqsArr.map((f, idx) => (
                <div key={idx} className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input className="input" placeholder="Question" value={f.q} onChange={e => { const next=[...faqsArr]; next[idx] = { ...f, q: e.target.value }; setFaqsArr(next); }} />
                  <input className="input" placeholder="Answer" value={f.a} onChange={e => { const next=[...faqsArr]; next[idx] = { ...f, a: e.target.value }; setFaqsArr(next); }} />
                  <div className="md:col-span-2 text-right">
                    <button type="button" className="btn-destructive" onClick={() => setFaqsArr(prev => prev.filter((_,i) => i!==idx))}>Remove</button>
                  </div>
                </div>
              ))}
              {faqsArr.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">No FAQs yet.</p>}
            </div>
          </div>

          {/* Schedule editor */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm">Schedule</label>
              <button type="button" className="btn-outline" onClick={() => setScheduleItems(prev => [...prev, { title: '', when: '', description: '' }])}>Add Item</button>
            </div>
            <div className="space-y-3">
              {scheduleItems.map((s, idx) => (
                <div key={idx} className="border rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input className="input" placeholder="Title" value={s.title} onChange={e => { const next=[...scheduleItems]; next[idx] = { ...s, title: e.target.value }; setScheduleItems(next); }} />
                  <input className="input" placeholder="When (e.g., Week 1, Sat 10am, 2025-10-01 10:00)" value={s.when} onChange={e => { const next=[...scheduleItems]; next[idx] = { ...s, when: e.target.value }; setScheduleItems(next); }} />
                  <div className="flex gap-2">
                    <input className="input flex-1" placeholder="Description (optional)" value={s.description || ''} onChange={e => { const next=[...scheduleItems]; next[idx] = { ...s, description: e.target.value }; setScheduleItems(next); }} />
                    <button type="button" className="btn-destructive" onClick={() => setScheduleItems(prev => prev.filter((_,i) => i!==idx))}>Remove</button>
                  </div>
                </div>
              ))}
              {scheduleItems.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">No schedule items yet.</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Start Date & Time</label>
            <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input" />
          </div>
          <div>
            <label className="block text-sm mb-1">Enrollment Deadline (Date & Time)</label>
            <input type="datetime-local" value={form.enrollment_deadline} onChange={(e) => setForm({ ...form, enrollment_deadline: e.target.value })} className="input" />
          </div>
        </div>
      </div>

      <section id="pricing" className="card">
        <div className="card-body">
          <h2 className="text-lg font-semibold mb-4">Pricing & Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p, idx) => (
              <div key={`${p.plan_type}-${p.family_size ?? 'solo'}`} className="border rounded p-4">
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">{p.plan_type === 'individual' ? 'Individual' : `Family of ${p.family_size}`}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs mb-1">Price</label>
                    <input value={p.price} onChange={(e) => {
                      const next = [...plans]; next[idx] = { ...p, price: e.target.value }; setPlans(next);
                    }} className="input" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Currency</label>
                    <input value={p.currency} onChange={(e) => {
                      const next = [...plans]; next[idx] = { ...p, currency: e.target.value }; setPlans(next);
                    }} className="input" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Duration (months)</label>
                    <input value={p.duration_months} onChange={(e) => {
                      const next = [...plans]; next[idx] = { ...p, duration_months: e.target.value }; setPlans(next);
                    }} className="input" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button onClick={savePlans} className="btn-primary">Save Plans</button>
            {plansMsg && <span className="ml-3 text-sm text-[hsl(var(--muted-foreground))]">{plansMsg}</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
