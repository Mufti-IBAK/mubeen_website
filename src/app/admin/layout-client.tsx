"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AdminSidebarNew } from "@/components/admin/SidebarNew";
import { FaBars, FaTimes } from "react-icons/fa";

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  // Suppress global site header on admin pages
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('admin-shell');
      return () => document.body.classList.remove('admin-shell');
    }
  }, []);

  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen((v) => !v), []);

  return (
    <div className="relative isolate min-h-screen md:flex">
      {/* New Sidebar (desktop in-flow, mobile overlay) */}
      <AdminSidebarNew open={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col w-full">
        <header className="md:hidden bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] flex items-center justify-between p-4 h-16 sticky top-0 z-50">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative w-10 h-10">
              <Image src="/logo.png" alt="Logo" fill style={{ objectFit: "contain" }} />
            </div>
            <span className="text-xl font-extrabold text-[#0b1b3f] dark:text-white">Mubeen Academy</span>
          </Link>
          <button onClick={toggleMobileMenu} className="p-2 rounded-md hover:bg-[hsl(var(--muted))]">
            {isMobileMenuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
