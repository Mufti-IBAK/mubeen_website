"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function AdminCoursesListPage() {
  const [courses, setCourses] = useState<Array<{ id: number; title: string; slug: string; is_flagship: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("courses").select("id, title, slug, is_flagship").order("created_at", { ascending: false });
      setCourses((data as Array<{ id: number; title: string; slug: string; is_flagship: boolean }>) || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand-dark font-heading">Courses</h1>
        <Link href="/admin/courses/new">
          <button className="rounded-md bg-brand-primary px-4 py-2 text-white font-semibold">New Course</button>
        </Link>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        {loading ? (
          <p className="text-brand-dark/70">Loading...</p>
        ) : courses.length === 0 ? (
          <p className="text-brand-dark/70">No courses yet. Click &quot;New Course&quot; to add one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="text-sm text-brand-dark/70">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Flagship</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2 pr-4">{c.title}</td>
                    <td className="py-2 pr-4">{c.slug}</td>
                    <td className="py-2 pr-4">{c.is_flagship ? "Yes" : "No"}</td>
                    <td className="py-2 pr-4 space-x-3">
                      <Link href={`/admin/courses/${c.id}`}>Edit</Link>
                      <Link href={`/admin/courses/${c.id}/forms`}>Forms</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

