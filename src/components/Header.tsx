'use client';

import Link from 'next/link';
import Image from 'next/image';
import React, { useState, useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useSignUpModalStore } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';
// Notifications feature removed

// --- SVG Icons ---
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const { openModal } = useSignUpModalStore(); // retained if you later re-enable modal CTA

    const navLinks = [
      { name: 'Home', href: '/', desc: 'Back to homepage' },
      { name: 'Programs', href: '/programs', desc: 'All learning programs' },
      { name: 'Skill Up', href: '/skill-up', desc: 'Master new skills' },
      { name: 'Resources', href: '/resources', desc: 'Downloadable resources' },
      { name: 'Payments', href: '/payment', desc: 'Make a payment' },
      { name: 'About', href: '/about', desc: 'Learn about us' },
      { name: 'Quick Guide', href: '/quick-guide', desc: 'Help & Tips' }
    ];

  useGSAP(() => {
    gsap.to('.mobile-menu', {
      clipPath: isMenuOpen ? 'circle(150% at top right)' : 'circle(0% at top right)',
      duration: 0.7,
      ease: 'power3.inOut',
    });
    gsap.fromTo(
      '.mobile-nav-link',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.2, paused: !isMenuOpen }
    );
  }, { scope: container, dependencies: [isMenuOpen] });

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = (data as { session: unknown } | undefined)?.session as { user?: { id: string } } | null;
      setIsAuthed(!!session);
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, dark_mode')
          .eq('id', session.user.id)
          .single();
        const role = (profile as { role?: string; dark_mode?: boolean } | null)?.role;
        setIsAdmin(role === 'admin' || role === 'super_admin');
        const dm = (profile as { dark_mode?: boolean } | null)?.dark_mode === true;
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', dm);
        }
      } else {
        setIsAdmin(false);
      }
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_event: unknown, session: unknown) => {
      setIsAuthed(!!session);
    });
    return () => { sub.subscription?.unsubscribe?.(); };
  }, []);

  // Focus trap for mobile menu and restore focus on close
  useEffect(() => {
    const focusableSelector = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    if (isMenuOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      // Focus first focusable in the menu
      setTimeout(() => {
        const first = menuRef.current?.querySelector<HTMLElement>(focusableSelector);
        first?.focus();
      });
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsMenuOpen(false);
          return;
        }
        if (e.key === 'Tab') {
          const focusables = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          } else if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        }
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    } else {
      // Restore focus to menu toggle button when closing
      (previouslyFocusedRef.current ?? menuButtonRef.current)?.focus?.();
    }
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen((v) => !v);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div ref={container}>
      <header className="site-header fixed top-0 z-50 w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/70 backdrop-blur-md">
        <div className="container-page flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/logo.png" alt="Mubeen Academy Logo" width={170} height={40} priority={true} className="h-12 w-auto" />
            <span className="text-2xl font-bold font-heading sm:block text-[#0b1b3f] dark:text-white">Mubeen Academy</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href} title={link.desc} className="group text-sm text-[hsl(var(--foreground))] font-semibold">
                  <span className="bg-left-bottom bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))] bg-[length:0%_2px] bg-no-repeat group-hover:bg-[length:100%_2px] transition-all duration-300 ease-out">
                    {link.name}
                  </span>
                </Link>
              ))}
            </nav>
            {!isAuthed ? (
              <div className="flex items-center gap-3">
                <Link href="/login" className="btn-outline">Log in</Link>
                <Link href="/login?mode=signup" className="btn-primary">Create Account</Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Notifications removed */}
                {isAdmin ? (
                  <Link href="/admin" className="btn-outline">Admin</Link>
                ) : (
                  <Link href="/dashboard" className="btn-outline">My Dashboard</Link>
                )}
                <button onClick={handleLogout} className="btn-ghost">Sign out</button>
              </div>
            )}
          </div>
          <div className="md:hidden">
            <button
              ref={menuButtonRef}
              onClick={toggleMenu}
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              className="p-2 text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors z-50"
            >
              {isMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-hidden={!isMenuOpen}
        ref={menuRef}
        className={`${isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'} mobile-menu fixed inset-0 z-40 bg-[hsl(var(--background))]/90 backdrop-blur-lg [clip-path:circle(0%_at_top_right)]`}
      >
        <div className="relative z-10 container-page h-full flex flex-col items-center justify-center">
          <nav className="flex flex-col items-center space-y-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="mobile-nav-link text-3xl md:text-4xl font-extrabold"
              >
                {link.name}
              </Link>
            ))}
          </nav>
          {!isAuthed ? (
            <div className="mt-12 flex flex-col items-center gap-4">
              <Link href="/login" onClick={() => setIsMenuOpen(false)} className="mobile-nav-link btn-outline px-8 py-3 text-xl">Log in</Link>
              <Link href="/login?mode=signup" onClick={() => setIsMenuOpen(false)} className="mobile-nav-link btn-primary px-8 py-4 text-xl">Create Account</Link>
            </div>
          ) : (
            <div className="mt-12 flex flex-col items-center gap-4">
              <div className="mobile-nav-link">{/* Notifications removed */}</div>
              {isAdmin ? (
                <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="mobile-nav-link btn-outline px-8 py-3 text-xl">Admin</Link>
              ) : (
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="mobile-nav-link btn-outline px-8 py-3 text-xl">My Dashboard</Link>
              )}
              <button onClick={() => { setIsMenuOpen(false); handleLogout(); }} className="mobile-nav-link btn-primary px-8 py-4 text-xl">Sign out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
