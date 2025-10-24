'use client';

import React from 'react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { supabase } from '@/lib/supabaseClient';

export const HeroSection = () => {
  const container = React.useRef<HTMLDivElement | null>(null);
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = React.useRef<HTMLParagraphElement | null>(null);
  const ctasRef = React.useRef<HTMLDivElement | null>(null);

  const [isAuthed, setIsAuthed] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const loadProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
      const role = (data as { role?: string } | null)?.role;
      setIsAdmin(role === 'admin' || role === 'super_admin');
    };
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setIsAuthed(!!session);
      if (session?.user?.id) await loadProfile(session.user.id);
      else setIsAdmin(false);
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e: unknown, session: any) => {
      setIsAuthed(!!session);
      if (session?.user?.id) await loadProfile(session.user.id);
      else setIsAdmin(false);
    });
    return () => {
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(titleRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 })
      .fromTo(subtitleRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3')
      .fromTo(ctasRef.current, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.3');

    // Floating accents
    gsap.to('.hero-float', { y: 12, repeat: -1, yoyo: true, duration: 2.8, ease: 'sine.inOut', stagger: 0.2 });

    // Animate gradient center points without obscuring content
    const bg = container.current?.querySelector('.hero-animated-bg') as HTMLElement | null;
    if (bg) {
      gsap.set(bg, { ['--r1x' as any]: '10%', ['--r1y' as any]: '10%', ['--r2x' as any]: '90%', ['--r2y' as any]: '20%' });
      gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } })
        .to(bg, { duration: 10, ['--r1x' as any]: '20%', ['--r1y' as any]: '15%', ['--r2x' as any]: '80%', ['--r2y' as any]: '25%' })
        .to(bg, { duration: 10, ['--r1x' as any]: '12%', ['--r1y' as any]: '8%', ['--r2x' as any]: '85%', ['--r2y' as any]: '18%' });
    }
  }, { scope: container });

  return (
    <section ref={container} className="relative isolate min-h-[75vh] w-full overflow-hidden">
      {/* Layered gradient background (animated) */}
      <div className="hero-animated-bg absolute inset-0 -z-10" />
      {/* Soft overlay to keep content/CTA readable */}
      <div className="absolute inset-0 -z-10 bg-[hsl(var(--background))]/85 dark:bg-black/60" />

      {/* Floating accent shapes */}
      <div className="hero-float absolute -left-10 top-24 h-40 w-40 rounded-full bg-[hsl(var(--primary))]/20 blur-2xl" />
      <div className="hero-float absolute right-0 top-40 h-36 w-36 rounded-full bg-[hsl(var(--accent))]/20 blur-2xl" />
      <div className="hero-float absolute left-1/3 bottom-10 h-24 w-24 rounded-full bg-[hsl(var(--primary))]/15 blur-2xl" />

      <div className="w-full text-center py-16 md:py-20">
        <h1 ref={titleRef} className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
          <span className="bg-gradient-to-r from-[hsl(var(--foreground))] to-[hsl(var(--primary))] bg-clip-text text-transparent">
            Learn. Grow. Serve.
          </span>
        </h1>
        <p ref={subtitleRef} className="mt-5 text-lg md:text-2xl text-[hsl(var(--muted-foreground))] max-w-3xl mx-auto">
          Authentic Islamic education with a modern experience — empowering students with knowledge, character, and action.
        </p>
        <div ref={ctasRef} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/programs" className="btn-primary px-8 py-3 text-base">
            Explore Programs
          </Link>
          {isAuthed ? (
            isAdmin ? (
              <Link href="/admin" className="btn-outline px-8 py-3 text-base">Admin</Link>
            ) : (
              <Link href="/dashboard" className="btn-outline px-8 py-3 text-base">My Dashboard</Link>
            )
          ) : (
            <Link href="/login?mode=signup" className="btn-outline px-8 py-3 text-base">Create Account</Link>
          )}
        </div>
      </div>
    </section>
  );
};
