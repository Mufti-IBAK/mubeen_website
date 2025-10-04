"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AdminCoursesNewPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pricePerMonth, setPricePerMonth] = useState("");
  const [pricePerSemester, setPricePerSemester] = useState("");
  const [isFlagship, setIsFlagship] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const { data, error } = await supabase.from("courses").insert({
      title,
      slug,
      description,
      image_url: imageUrl,
      price_per_month: pricePerMonth ? Number(pricePerMonth) : null,
      price_per_semester: pricePerSemester ? Number(pricePerSemester) : null,
      is_flagship: isFlagship,
    }).select().single();
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Course created! Redirecting to form builder...");
    window.location.href = `/admin/courses/${data.id}/forms`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand-dark font-heading">New Course</h1>
        <Link href="/admin/courses">Back</Link>
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
          <label className="block text-sm mb-1">Image URL</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Price / Month</label>
          <input value={pricePerMonth} onChange={(e) => setPricePerMonth(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Price / Semester</label>
          <input value={pricePerSemester} onChange={(e) => setPricePerSemester(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <input id="flagship" type="checkbox" checked={isFlagship} onChange={(e) => setIsFlagship(e.target.checked)} />
          <label htmlFor="flagship">Flagship Program</label>
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={saving} className="rounded-md bg-brand-primary px-4 py-2 text-white font-semibold">
            {saving ? "Saving..." : "Save & Create Forms"}
          </button>
          {message && <p className="text-sm text-brand-dark/70 mt-2">{message}</p>}
        </div>
      </form>
    </div>
  );
}

