"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  FiBookOpen,
  FiUserCheck,
  FiCreditCard,
  FiLayout,
} from "react-icons/fi";

export default function QuickGuidePage() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!container.current) return;
      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: 0.8 },
      });

      tl.from(".guide-hero-text", { y: 50, opacity: 0, stagger: 0.2 }).from(
        ".guide-card",
        { y: 30, opacity: 0, stagger: 0.15 },
        "-=0.4"
      );
    },
    { scope: container }
  );

  return (
    <main
      className="min-h-screen bg-[hsl(var(--background))] pt-24 pb-16 px-6"
      ref={container}
    >
      <div className="container-page max-w-5xl mx-auto">
        <header className="text-center mb-16 guide-hero-text">
          <h1 className="text-4xl md:text-5xl font-extrabold font-heading mb-4">
            <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
              Quick Guide
            </span>{" "}
            & Help Center
          </h1>
          <p className="text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
            Everything you need to know to navigate Mubeen Academy, register for
            programs, and manage your learning journey.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Navigation & Dashboard */}
          <section className="guide-card bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <FiLayout className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold font-heading">
                Navigating the Platform
              </h2>
            </div>
            <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
              <p>
                <strong>Dashboard:</strong> Your central hub. Once logged in,
                access it from the top-right menu. Here you calculate enrollment
                status, view receipts, and update your profile.
              </p>
              <p>
                <strong>Programs:</strong> Browse our course catalog. Use
                filters to find Flagship, Upcoming, or Ongoing courses. Click
                "View Details" for curriculum and pricing.
              </p>
              <p>
                <strong>Profile Updates:</strong>{" "}
                <span className="text-brand-primary font-semibold">
                  Important!
                </span>{" "}
                You must provide a working WhatsApp number in your profile. This
                ensures you receive timely class notifications.
              </p>
            </div>
          </section>

          {/* Registration Workflow */}
          <section className="guide-card bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                <FiUserCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold font-heading">
                How to Register
              </h2>
            </div>
            <ul className="space-y-4 text-[hsl(var(--muted-foreground))] list-disc list-outside ml-4">
              <li>
                <strong>Select a Program:</strong> Navigate to the{" "}
                <a href="/programs" className="text-brand-primary underline">
                  Programs page
                </a>{" "}
                and choose a course.
              </li>
              <li>
                <strong>Fill the Form:</strong> Click "Register Now". You will
                be asked for personal details. For Family plans, you will add
                details for each member.
              </li>
              <li>
                <strong>Review:</strong> Check your information carefully before
                submitting.
              </li>
              <li>
                <strong>Confirmation:</strong> Upon success, you will be
                redirected to the Payment page (if applicable) or your
                Dashboard.
              </li>
            </ul>
          </section>

          {/* Payment Workflow */}
          <section className="guide-card bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                <FiCreditCard className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold font-heading">
                Payments & Subscriptions
              </h2>
            </div>
            <div className="space-y-4 text-[hsl(var(--muted-foreground))]">
              <p>
                After registering, you can pay immediately or later via your
                Dashboard ("Unpaid Enrollments").
              </p>
              <div className="bg-[hsl(var(--muted))] p-4 rounded-lg text-sm">
                <strong>Accepted Methods:</strong> Bank Transfer, Card Payment
                (Flutterwave).
                <br />
                <em>
                  Note: Ensure you keep your transaction receipt reference if
                  paying via Bank Transfer.
                </em>
              </div>
              <p>
                <strong>Subscriptions:</strong> Some programs have recurring
                fees (Monthly/Weekly). Your dashboard will show when your next
                payment is due.
              </p>
            </div>
          </section>

          {/* Tips */}
          <section className="guide-card bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                <FiBookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold font-heading">Pro Tips</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 text-[hsl(var(--muted-foreground))]">
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✅</span>
                <p>
                  Always keep your profile updated, especially phone number and
                  email.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✅</span>
                <p>
                  Check the "Resources" tab for free learning materials and
                  guides.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✅</span>
                <p>
                  Use Dark Mode (in Dashboard preferences) for comfortable night
                  reading.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-16 text-center guide-card">
          <p className="mb-6 text-lg">Still need help?</p>
          <a
            href="mailto:mubeenacademy001@gmail.com"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-lg"
          >
            Contact Support
          </a>
        </div>
      </div>
    </main>
  );
}
