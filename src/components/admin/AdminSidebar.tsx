"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// Assuming these icons are imported from a library like 'lucide-react' or similar
import { FiLayout, FiBookOpen, FiUsers, FiFileText, FiSettings, FiAlertCircle, FiSun, FiCreditCard, FiGlobe } from 'react-icons/fi';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const nav = [
    { href: "/admin", name: "Dashboard", icon: FiLayout },
    { name: "Programs", href: "/admin/programs", icon: FiBookOpen },
    { name: "Skills", href: "/admin/skills", icon: FiSun },
    { name: "Pricing Plans", href: "/admin/pricing", icon: FiCreditCard },
    { name: "Assignments", href: "/admin/assignments", icon: FiFileText },
    { name: "Enrollments", href: "/admin/enrollments", icon: FiUsers },
    { name: "Unpaid", href: "/admin/unpaid_enroll", icon: FiAlertCircle },
    { name: "User Management", href: "/admin/user-management", icon: FiUsers },
    // Public Links
    { name: "Skill Up (Public)", href: "/skill-up", target: "_blank", icon: FiGlobe },
  ];
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white dark:bg-[#0d1528] border-r border-gray-200 dark:border-white/10 min-h-screen p-4 sticky top-0">
      <h2 className="text-xl font-bold text-brand-dark dark:text-white font-heading mb-6">
        Admin Panel
      </h2>
      <nav className="flex flex-col space-y-2">
        {nav.map((i) => {
          const active =
            pathname === i.href ||
            (i.href !== "/admin" && pathname?.startsWith(i.href));
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`rounded px-3 py-2 transition-colors ${
                active
                  ? "bg-brand-primary/10 text-brand-primary font-semibold"
                  : "text-brand-dark/80 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5"
              }`}
            >
              {i.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
