"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AdminProgramsNewPage() {
  // Core fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [tags, setTags] = useState("");
  const [isFlagship, setIsFlagship] = useState(false);
  const [overview, setOverview] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [level, setLevel] = useState("");
  const [language, setLanguage] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  // Guided editors
  type Instructor = { name: string; title?: string; avatar_url?: string };
  type Faq = { q: string; a: string };
  type SItem = { title: string; when: string; description?: string };
  const [instructorsArr, setInstructorsArr] = useState<Instructor[]>([]);
  const [faqsArr, setFaqsArr] = useState<Faq[]>([]);
  const [scheduleItems, setScheduleItems] = useState<SItem[]>([]);

  const uploadToBucket = async (file: File) => {
    const path = `${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('program-images').upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('program-images').getPublicUrl(path);
    return data.publicUrl as string;
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true); setMessage(""); setUploadMsg("");
    const fd = new FormData(e.currentTarget);
    let coverUrl = imageUrl?.trim() || '';
    const file = fd.get('image') as File | null;
    try {
      if (file && file.size > 0) {
        setUploadMsg('Uploading image...');
        coverUrl = await uploadToBucket(file);
      }
    } catch (err: any) {
      setUploadMsg(err.message || 'Upload failed');
      setSaving(false);
      return;
    }
    const payload = {
      title,
      slug,
      description,
      image_url: coverUrl,
      duration,
      tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : null,
      is_flagship: isFlagship,
      overview: overview || null,
      prerequisites: prerequisites || null,
      level: level || null,
      language: language || null,
      outcomes: outcomes ? outcomes.split(',').map(s => s.trim()).filter(Boolean) : null,
      instructors: instructorsArr.filter(i => i.name.trim()),
      faqs: faqsArr.filter(f => f.q.trim() && f.a.trim()),
      schedule: { items: scheduleItems.filter(s => s.title.trim() && s.when.trim()) },
      start_date: startDate || null,
      enrollment_deadline: deadline || null,
    };
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      const res = await fetch('/api/admin/programs/create', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { 'authorization': `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
      const json = await res.json();
      setSaving(false);
      if (!res.ok || !json?.ok) { setMessage(json?.error || 'Failed to create program'); return; }
      setMessage("Program created! Redirecting to configuration...");
      window.location.href = `/admin/programs/${json.id}`;
    } catch (err: any) {
      setSaving(false);
      setMessage(err?.message || 'Failed to create program');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand-dark font-heading">New Program</h1>
        <Link href="/admin/programs">Back</Link>
      </div>
      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border px-3 py-2 rounded" rows={4} />
        </div>
        <div>
          <label className="block text-sm mb-1">Overview</label>
          <textarea value={overview} onChange={(e) => setOverview(e.target.value)} className="w-full border px-3 py-2 rounded" rows={4} />
        </div>
        <div>
          <label className="block text-sm mb-1">Prerequisites</label>
          <textarea value={prerequisites} onChange={(e) => setPrerequisites(e.target.value)} className="w-full border px-3 py-2 rounded" rows={4} />
        </div>
        <div>
          <label className="block text-sm mb-1">Level</label>
          <input value={level} onChange={(e) => setLevel(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Language</label>
          <input value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Outcomes (comma-separated)</label>
          <input value={outcomes} onChange={(e) => setOutcomes(e.target.value)} className="w-full border px-3 py-2 rounded" />
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
                <input className="w-full border px-3 py-2 rounded" placeholder="Name" value={ins.name} onChange={e => { const next=[...instructorsArr]; next[idx] = { ...ins, name: e.target.value }; setInstructorsArr(next); }} />
                <input className="w-full border px-3 py-2 rounded" placeholder="Title / Role" value={ins.title || ''} onChange={e => { const next=[...instructorsArr]; next[idx] = { ...ins, title: e.target.value }; setInstructorsArr(next); }} />
                <div className="flex gap-2">
                  <input className="w-full border px-3 py-2 rounded" placeholder="Avatar URL" value={ins.avatar_url || ''} onChange={e => { const next=[...instructorsArr]; next[idx] = { ...ins, avatar_url: e.target.value }; setInstructorsArr(next); }} />
                  <button type="button" className="btn-destructive" onClick={() => setInstructorsArr(prev => prev.filter((_,i) => i!==idx))}>Remove</button>
                </div>
              </div>
            ))}
            {instructorsArr.length === 0 && <p className="text-xs text-brand-dark/70">No instructors yet.</p>}
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
                <input className="w-full border px-3 py-2 rounded" placeholder="Question" value={f.q} onChange={e => { const next=[...faqsArr]; next[idx] = { ...f, q: e.target.value }; setFaqsArr(next); }} />
                <input className="w-full border px-3 py-2 rounded" placeholder="Answer" value={f.a} onChange={e => { const next=[...faqsArr]; next[idx] = { ...f, a: e.target.value }; setFaqsArr(next); }} />
                <div className="md:col-span-2 text-right">
                  <button type="button" className="btn-destructive" onClick={() => setFaqsArr(prev => prev.filter((_,i) => i!==idx))}>Remove</button>
                </div>
              </div>
            ))}
            {faqsArr.length === 0 && <p className="text-xs text-brand-dark/70">No FAQs yet.</p>}
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
                <input className="w-full border px-3 py-2 rounded" placeholder="Title" value={s.title} onChange={e => { const next=[...scheduleItems]; next[idx] = { ...s, title: e.target.value }; setScheduleItems(next); }} />
                <input className="w-full border px-3 py-2 rounded" placeholder="When (e.g., Week 1, Sat 10am, 2025-10-01 10:00)" value={s.when} onChange={e => { const next=[...scheduleItems]; next[idx] = { ...s, when: e.target.value }; setScheduleItems(next); }} />
                <div className="flex gap-2">
                  <input className="w-full border px-3 py-2 rounded" placeholder="Description (optional)" value={s.description || ''} onChange={e => { const next=[...scheduleItems]; next[idx] = { ...s, description: e.target.value }; setScheduleItems(next); }} />
                  <button type="button" className="btn-destructive" onClick={() => setScheduleItems(prev => prev.filter((_,i) => i!==idx))}>Remove</button>
                </div>
              </div>
            ))}
            {scheduleItems.length === 0 && <p className="text-xs text-brand-dark/70">No schedule items yet.</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Start Date & Time</label>
          <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Enrollment Deadline (Date & Time)</label>
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Upload Cover</label>
          <input name="image" type="file" className="w-full border px-3 py-2 rounded" />
          {uploadMsg && <p className="text-xs text-brand-dark/70 mt-1">{uploadMsg}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Or Image URL</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Duration</label>
          <input value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Tags (comma-separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <input id="flagship2" type="checkbox" checked={isFlagship} onChange={(e) => setIsFlagship(e.target.checked)} />
          <label htmlFor="flagship2">Flagship Program</label>
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="rounded-md bg-brand-primary px-4 py-2 text-white font-semibold">
            {saving ? "Saving..." : "Save Program"}
          </button>
          {message && <p className="text-sm text-brand-dark/70 mt-2">{message}</p>}
        </div>
      </form>
    </div>
  );
}

