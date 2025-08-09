'use client';

import Link from 'next/link';
import Image from 'next/image';
import React from 'react'; // Removed useState and useRef as they are not needed for this version
import { useSignUpModalStore } from '@/lib/store'; // Import our store

export const Header = () => {
  const { openModal } = useSignUpModalStore(); // Get the action to open the modal

  const navLinks = [ { name: 'Home', href: '/' }, { name: 'Programs', href: '/programs' }, { name: 'About', href: '/about' } ];

  // Simplified version without the mobile menu logic for clarity
  return (
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
            {/* FIX: This is now a button that opens the modal, not a link */}
            <button 
              onClick={openModal}
              className="rounded-md bg-brand-primary px-4 py-2 text-lg font-semibold text-white transition-transform duration-300 ease-in-out hover:scale-105"
            >
              Register
            </button>
          </div>
          <div className="md:hidden">
            {/* Mobile menu button logic will also need to be updated to open the modal */}
            <button onClick={openModal} aria-label="Open menu" className="p-2 text-brand-dark hover:text-brand-primary transition-colors z-50">
                {/* ... MenuIcon ... */}
            </button>
          </div>
        </div>
      </header>
  );
};