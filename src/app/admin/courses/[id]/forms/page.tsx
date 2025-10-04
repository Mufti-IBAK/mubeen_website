import React from "react";
import Link from "next/link";
import { CourseFormsClient } from "./FormClient";

export default async function CourseFormsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const courseId = Number(id);
  return (
    <div className="relative isolate">
      {/* Page gradient background for vibrant theme */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_400px_at_0%_0%,hsl(var(--primary))_10%,transparent_60%),radial-gradient(700px_350px_at_100%_0%,hsl(var(--accent))_10%,transparent_60%)] opacity-[0.15] pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent">Course Forms</h1>
        <Link href={`/admin/courses`} className="btn-outline">Back to Courses</Link>
      </div>
      <CourseFormsClient courseId={courseId} />
    </div>
  );
}
