import Link from 'next/link';
import React from 'react';

const SocialIcon = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-light/70 hover:text-brand-primary transition-colors">
    {children}
  </a>
);

export const Footer = () => {
  return (
    <footer className="bg-[hsl(var(--card))] border-t border-[hsl(var(--border))]">
      <div className="container-page py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <h3 className="text-2xl font-bold">Mubeen Academy</h3>
          <p className="mt-3 text-[hsl(var(--muted-foreground))] max-w-sm">
            Nurturing a community of learners with knowledge, character, and action.
          </p>
        </div>
        <div>
          <h4 className="font-semibold tracking-wider">Explore</h4>
          <nav className="mt-4 flex flex-col space-y-2">
            <Link href="/programs" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">All Programs</Link>
            <Link href="/resources" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Resource Library</Link>
            <Link href="/about" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">About Us</Link>
          </nav>
        </div>
        <div>
          <h4 className="font-semibold tracking-wider">Account</h4>
          <nav className="mt-4 flex flex-col space-y-2">
            <Link href="/login" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Sign in</Link>
            <Link href="/login?mode=signup" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Create account</Link>
            <Link href="/dashboard" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">Dashboard</Link>
          </nav>
        </div>
        <div>
          <h4 className="font-semibold tracking-wider">Contact</h4>
          <div className="mt-4 flex flex-col space-y-2">
            <a href="mailto:mubeenacademy001@gmail.com" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">mubeenacademy001@gmail.com</a>
            <div className="flex space-x-4 pt-2">
              <SocialIcon href="#">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path></svg>
              </SocialIcon>
              <SocialIcon href="#">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>
              </SocialIcon>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-[hsl(var(--border))] text-center text-[hsl(var(--muted-foreground))] py-6">
        <p>&copy; {new Date().getFullYear()} Mubeen Academy. All rights reserved.</p>
      </div>
    </footer>
  );
};
