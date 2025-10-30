"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  FaTachometerAlt,
  FaBook,
  FaUsers,
  FaHome,
  FaGlobe,
  FaFileAlt,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaBell,
} from "react-icons/fa";

export function AdminSidebarNew({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const mobileRef = useRef<HTMLDivElement | null>(null);

  const nav = [
    { href: "/admin", label: "Dashboard", icon: FaTachometerAlt },
    { href: "/admin/programs", label: "Programs", icon: FaBook },
    { href: "/admin/registrations", label: "Registrations", icon: FaFileAlt },
    { href: "/admin/unpaid_enroll", label: "Unpaid Enrollments", icon: FaFileAlt },
    { href: "/admin/resources", label: "Resources", icon: FaFileAlt },
    { href: "/admin/user-management", label: "Users", icon: FaUsers },
  ];

  const isActive = (href: string) => pathname === href || (href !== "/admin" && pathname?.startsWith(href));

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch {
      // no-op
    }
  };

  // Collapsible + resizable (desktop only)
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState<number>(280);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('adminSidebarWidth');
    if (saved) setWidth(Number(saved));
    const savedCollapsed = window.localStorage.getItem('adminSidebarCollapsed');
    if (savedCollapsed === '1') setCollapsed(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('adminSidebarWidth', String(width));
  }, [width]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('adminSidebarCollapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    if (window.innerWidth < 768) return; // desktop only
    draggingRef.current = true;
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = ev.clientX - startX;
      const next = Math.min(360, Math.max(200, startW + delta));
      setWidth(next);
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);

  // Accessibility: trap focus within the mobile drawer and close on Escape
  useEffect(() => {
    if (!open) return;
    const root = mobileRef.current;
    if (!root) return;

    // Focus first focusable element or the container itself
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0] || root;
    first.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const list = Array.from(focusables).filter(el => el.offsetParent !== null);
        if (list.length === 0) return;
        const current = document.activeElement as HTMLElement | null;
        const idx = current ? list.indexOf(current) : -1;
        if (e.shiftKey) {
          // Shift+Tab
          if (idx <= 0) {
            e.preventDefault();
            list[list.length - 1].focus();
          }
        } else {
          if (idx === -1 || idx >= list.length - 1) {
            e.preventDefault();
            list[0].focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const Inner = (
    <div className="flex h-full flex-col bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] border-r border-[hsl(var(--border))]" style={{ width: collapsed ? 80 : width }}>
      <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between h-16 flex-shrink-0">
        <Link href="/admin" className="flex items-center space-x-2">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image src="/logo.png" alt="Logo" fill style={{ objectFit: "contain" }} />
          </div>
{!collapsed && <span className="text-xl font-bold text-[#0b1b3f] dark:text-white">Mubeen Academy</span>}
        </Link>
        <button onClick={() => setCollapsed(v => !v)} className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-[hsl(var(--muted))]" title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-2 py-4 space-y-1">
          {nav.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`relative flex items-center py-3 ${collapsed ? 'px-3 justify-center' : 'px-6'} rounded-md transition-colors ${
                  active ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                }`}
                onClick={onClose}
                title={n.label}
              >
                {/* Active pill indicator */}
                {active && !collapsed && (
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 h-5/6 w-1 rounded-full bg-[hsl(var(--primary))]" />
                )}
                <n.icon size={18} className="flex-shrink-0" aria-hidden="true" />
                {!collapsed && <span className="ml-3 whitespace-nowrap">{n.label}</span>}
              </Link>
            );
          })}
        </div>

        <div className="h-8" />

        <div className="px-2 pb-2 border-t border-[hsl(var(--border))] mt-4">
          <div className="pt-4 space-y-2">
            {!collapsed && <p className="px-6 text-xs text-[hsl(var(--muted-foreground))] font-semibold uppercase tracking-wider">Public Site</p>}
            <Link href="/" className={`flex items-center py-3 ${collapsed ? 'px-3 justify-center' : 'px-6'} rounded-md hover:bg-[hsl(var(--muted))]`} onClick={onClose} title="Homepage">
              <FaHome size={18} />
              {!collapsed && <span className="ml-3">Homepage</span>}
            </Link>
            <Link href="/resources" className={`flex items-center py-3 ${collapsed ? 'px-3 justify-center' : 'px-6'} rounded-md hover:bg-[hsl(var(--muted))]`} onClick={onClose} title="Resources">
              <FaGlobe size={18} />
              {!collapsed && <span className="ml-3">Resources</span>}
            </Link>
            <Link href="/programs" className={`flex items-center py-3 ${collapsed ? 'px-3 justify-center' : 'px-6'} rounded-md hover:bg-[hsl(var(--muted))]`} onClick={onClose} title="Programs">
              <FaBook size={18} />
              {!collapsed && <span className="ml-3">Programs</span>}
            </Link>
          </div>
        </div>

        <div className="px-2 pb-4 border-t border-[hsl(var(--border))] mt-4">
          <div className="pt-4">
            <button
              onClick={signOut}
              className={`flex items-center w-full py-3 ${collapsed ? 'px-3 justify-center' : 'px-6'} text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-md transition-colors text-sm`}
              title="Sign Out"
            >
              <FaSignOutAlt size={18} className="flex-shrink-0" />
              {!collapsed && <span className="ml-3 whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        </div>

        <div className="h-8 md:h-0" />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar as part of layout (no fixed positioning) */}
      <aside className="hidden md:flex md:shrink-0">
        {/* Resizable container */}
        <div className="relative">
          {Inner}
          {/* Resize handle */}
          {!collapsed && (
            <div
              onMouseDown={startDrag}
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-[hsl(var(--border))]"
              role="separator"
              aria-orientation="vertical"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setWidth(w => Math.max(200, w - 10));
                if (e.key === 'ArrowRight') setWidth(w => Math.min(360, w + 10));
              }}
            />
          )}
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" aria-hidden={false}>
          <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden={true} />
          <aside
            ref={mobileRef as any}
            className="absolute inset-y-0 left-0 w-64 transform transition-transform duration-300 translate-x-0 outline-none"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            tabIndex={-1}
          >
            {Inner}
          </aside>
        </div>
      )}
    </>
  );
}

