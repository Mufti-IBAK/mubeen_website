"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AdminResourcesNewPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const uploadToBucket = async (bucket: string, file: File) => {
    const path = `${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl as string;
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSaving(true); setMessage("");
    try {
      const formData = new FormData(e.currentTarget);
      let finalFileUrl = fileUrl.trim();
      let finalCoverUrl = coverUrl.trim();
      const file = formData.get('file') as File | null;
      const cover = formData.get('cover') as File | null;
      if (file && file.size > 0) finalFileUrl = await uploadToBucket('resources', file);
      if (cover && cover.size > 0) finalCoverUrl = await uploadToBucket('resource-covers', cover);
      if (!finalFileUrl) throw new Error('Please provide a file (upload or URL).');
      const { error } = await supabase.from('resources').insert({
        title,
        description,
        file_url: finalFileUrl,
        cover_url: finalCoverUrl || null,
        category: category || null,
      });
      if (error) throw error;
      window.location.href = '/admin/resources';
    } catch (err: any) {
      setMessage(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand-dark font-heading">New Resource</h1>
        <Link href="/admin/resources">Back</Link>
      </div>
      <form onSubmit={handleSave} className="card grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" rows={4} />
        </div>
        <div>
          <label className="block text-sm mb-1">Upload File</label>
          <input name="file" type="file" className="input" />
        </div>
        <div>
          <label className="block text-sm mb-1">File URL (optional)</label>
          <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm mb-1">Cover Image</label>
          <input name="cover" type="file" className="input" />
        </div>
        <div>
          <label className="block text-sm mb-1">Cover URL (optional)</label>
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm mb-1">Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="input" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Resource'}</button>
          {message && <span className="ml-3 text-sm text-[hsl(var(--muted-foreground))]">{message}</span>}
        </div>
      </form>
    </div>
  );
}

