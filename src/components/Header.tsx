'use client';

import Link from 'next/link';
import Image from 'next/image';
import React, { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useSignUpModalStore } from '@/lib/store'; // Import the store for the modal

// --- SVG Icons ---
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg> );
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg> );

export const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const container = useRef(null);
    const { openModal } = useSignUpModalStore(); // Get the action to open the sign-up modal

    const navLinks = [ { name: 'Home', href: '/' }, { name: 'Programs', href: '/programs' }, { name: 'About', href: '/about' } ];
    
    useGSAP(() => {
      gsap.to('.mobile-menu', { clipPath: isMenuOpen ? 'circle(150% at top right)' : 'circle(0% at top right)', duration: 0.7, ease: 'power3.inOut' });
      gsap.fromTo('.mobile-nav-link', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.2, paused: !isMenuOpen });
    }, { scope: container, dependencies: [isMenuOpen] });
  
    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div ref={container}>
      <header className="fixed top-0 z-50 w-full border-b border-brand-dark/10 bg-brand-bg/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between p-4">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/logo.png" alt="Mubeen Academy Logo" width={140} height={35} priority={true} className="h-10 w-auto"/>
            <span className="text-2xl font-bold text-brand-primary font-heading hidden sm:block">
              Mubeen Academy
            </span>
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex items-center space-x-8">
              {navLinks.map((link) => ( <Link key={link.name} href={link.href} className="group text-lg text-brand-dark transition-all duration-300 ease-in-out font-heading"><span className="bg-left-bottom bg-gradient-to-r from-brand-primary to-brand-primary bg-[length:0%_2px] bg-no-repeat group-hover:bg-[length:100%_2px] transition-all duration-500 ease-out">{link.name}</span></Link> ))}
            </nav>
            {/* The main Register button now correctly opens the modal */}
            <button onClick={openModal} className="rounded-md bg-brand-primary px-4 py-2 text-lg font-semibold text-white transition-transform duration-300 ease-in-out hover:scale-105">Register</button>
          </div>
          {/* FIX: The hamburger menu button is restored and fully functional */}
          <div className="md:hidden">
            <button onClick={toggleMenu} aria-label="Open navigation menu" className="p-2 text-brand-dark hover:text-brand-primary transition-colors z-50">{isMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}</button>
          </div>
        </div>
      </header>
      
      {/* The mobile menu dropdown, which is controlled by the hamburger button */}
      <div className="mobile-menu pointer-events-none fixed inset-0 z-40 bg-brand-bg/80 backdrop-blur-lg [clip-path:circle(0%_at_top_right)]">
        <div className="relative z-10 container mx-auto h-full flex flex-col items-center justify-center pointer-events-auto">
            <nav className="flex flex-col items-center space-y-8">
                {navLinks.map((link) => ( <Link key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)} className="mobile-nav-link text-4xl font-bold text-brand-dark font-heading">{link.name}</Link>))}
            </nav>
            <button onClick={() => { setIsMenuOpen(false); openModal(); }} className="mobile-nav-link mt-12 rounded-md bg-brand-primary px-8 py-4 text-2xl font-semibold text-white font-heading">Register</button>
        </div>
      </div>
    </div>
  );
};