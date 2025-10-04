"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function AdminResourcesEditPage() {
  const params = useParams();
  const id = Number((params?.id as string) || '');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ title: "", description: "", file_url: "", cover_url: "", category: "" });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('resources').select('*').eq('id', id).single();
      if (data) setForm({ title: data.title || '', description: data.description || '', file_url: data.file_url || '', cover_url: data.cover_url || '', category: data.category || '' });
      setLoading(false);
    };
    load();
  }, [id]);

  const uploadToBucket = async (bucket: string, file: File) => {
    const path = `${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl as string;
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setMessage('');
    try {
      const fd = new FormData(e.currentTarget);
      let file_url = form.file_url?.trim() || '';
      let cover_url = form.cover_url?.trim() || '';
      const file = fd.get('file') as File | null;
      const cover = fd.get('cover') as File | null;
      if (file && file.size > 0) file_url = await uploadToBucket('resources', file);
      if (cover && cover.size > 0) cover_url = await uploadToBucket('resource-covers', cover);
      const { error } = await supabase.from('resources').update({ title: form.title, description: form.description, file_url, cover_url: cover_url || null, category: form.category || null }).eq('id', id);
      if (error) throw error;
      setMessage('Saved');
    } catch (err: any) {
      setMessage(err.message || 'Failed');
    }
  };

  if (loading) return <p className="text-brand-dark/70">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand-dark font-heading">Edit Resource</h1>
        <Link href="/admin/resources">Back</Link>
      </div>
      <form onSubmit={save} className="bg-white p-6 rounded-lg shadow grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border px-3 py-2 rounded" rows={4} />
        </div>
        <div>
          <label className="block text-sm mb-1">Upload File</label>
          <input name="file" type="file" className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">File URL</label>
          <input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Cover Image</label>
          <input name="cover" type="file" className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Cover URL</label>
          <input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Category</label>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="rounded-md bg-brand-primary px-4 py-2 text-white font-semibold">Save</button>
          {message && <span className="ml-3 text-sm text-brand-dark/70">{message}</span>}
        </div>
      </form>
    </div>
  );
}

