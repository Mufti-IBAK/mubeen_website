import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  const resolvedParams = await searchParams;
  const program = resolvedParams?.program;
  
  // Redirect old URL format to new format
  if (program) {
    redirect(`/programs/${program}/register`);
  }
  
  // If no program parameter, show message
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-4">No Program Selected</h1>
        <p className="text-[hsl(var(--muted-foreground))] mb-8">
          Please select a program from our programs page.
        </p>
        <a href="/programs" className="btn-primary">
          View Programs
        </a>
      </div>
    </div>
  );
}

