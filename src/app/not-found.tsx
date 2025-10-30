import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-[hsl(var(--foreground))] mb-4">404</h1>
        <p className="text-xl text-[hsl(var(--muted-foreground))] mb-2">Page Not Found</p>
        <p className="text-[hsl(var(--muted-foreground))] mb-8">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Link href="/" className="btn-primary">
          Return Home
        </Link>
      </div>
    </div>
  );
}
