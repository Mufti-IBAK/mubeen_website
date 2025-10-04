# Mubeen Website

A production-ready Next.js 15 (App Router) application using React 19, Tailwind CSS, and Supabase for auth, data, and Row-Level Security (RLS). The app powers public pages, user registration (individual and family flows), an authenticated dashboard, and an admin panel for managing programs, forms, plans, resources, users, and notifications. Includes database schema and utility scripts to seed and verify the registration pipeline.

- Framework: Next.js 15 (App Router), React 19, TypeScript
- Styling: Tailwind CSS + PostCSS
- Backend: Supabase (auth, database, storage) with strict RLS
- State: Zustand
- Validation: Zod
- Email: Resend (optional)
- Payments: Flutterwave webhook endpoint present (optional integration)

## Quick Start

Prerequisites:
- Node.js 18+ (recommended)
- Supabase project (URL + anon key + service role key)

Setup:
1. Install dependencies
   ```bash
   npm install
   ```
2. Configure environment
   Create a .env.local with at least:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
   SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
   # Optional
   RESEND_API_KEY=<resend_api_key>
   ```
3. Run the database schema in Supabase (SQL Editor)
   - Open supabase/schema.sql and run it in your project's SQL editor.
   - Optional: run additional scripts in supabase/*.sql for fixes/seeding as needed.
4. Seed and verify the registration pipeline (optional but recommended)
   ```bash
   node scripts/check-and-seed-forms.js
   node scripts/verify-registration-flow.js
   ```
5. Start the dev server
   ```bash
   npm run dev
   ```

## Project Structure

- .next/ — Next.js build output (generated)
- docs/
  - RLS-PERMISSION-ALGORITHM.md — Design notes for handling Supabase RLS and admin operations
- node_modules/ — Dependencies (generated)
- public/
  - Static assets (logos, svgs, images, patterns)
- scripts/
  - check-and-seed-forms.js — Seeds missing program forms and plans
  - verify-registration-flow.js — Verifies the end-to-end registration chain across programs, plans, and forms
- src/
  - app/ — Next.js App Router
    - layout.tsx, page.tsx, globals.css
    - about/page.tsx — Static About page
    - auth/callback/page.tsx — Auth callback handler
    - dashboard/... — Authenticated user dashboards
    - enroll/page.tsx — Entry to enrollment
    - login/page.tsx — Login page
    - payment-success/page.tsx — Post-payment screen
    - programs/page.tsx & programs/[slug]/page.tsx — Programs listing and detail
    - register/... — Dynamic registration flow UI
    - resources/page.tsx — Public resources listing
    - admin/... — Admin area (programs, courses, forms, users, registrations, resources, notifications)
      - Example admin pages: programs/new, programs/[id]/forms, programs/[id]/registrations, user-management, users
    - api/... — Server routes (all server-side)
      - admin/delete-user — Remove a user (server-side; service role)
      - admin/enrollments/bulk — Bulk enrollment operations
      - admin/forms/upsert — Upsert program forms
      - admin/programs/create — Create program
      - admin/programs/[id]/update — Update program
      - admin/refund — Refund endpoint (payment admin)
      - admin/send-email — Email via Resend (if configured)
      - drafts — Draft registration persistence
      - flutterwave-webhook — Payment webhook receiver
      - notifications/pin, notifications/read, notifications/read-all — Notification operations
      - send-confirmation — Send confirmation email/notice
  - components/
    - UI and feature components: AuthGate, AdminSidebar, DynamicRegistrationFlow, RegistrationForm, Family/Individual flows, FormBuilder/FormRenderer, NotificationBell, toast components, etc.
  - hooks/
    - useDraftRegistration.ts — Abstraction around saving in-progress registrations
  - lib/
    - supabaseClient.ts — Supabase client creation (client-side)
    - store.ts — Zustand store
    - utils.ts, imageData.ts — Utilities and assets metadata
  - types/
    - index.ts — Shared TypeScript types
- supabase/
  - schema.sql — Tables, RLS policies, triggers (profiles, programs, program_forms, enrollments, resources, etc.)
  - seed_*.sql — Example seeds (forms, demo programs)
  - fix_*.sql — Hotfix/policy migrations
- next.config.ts — Next.js configuration (remote image domains include Pexels and Supabase Storage)
- tailwind.config.js — Tailwind theme, plugins (forms, typography)
- postcss.config.js — PostCSS config
- tsconfig.json — TypeScript config with path alias @/* → ./src/*
- package.json — Scripts and dependencies

## Key Features

- Public site with programs, resources, and marketing sections
- Authenticated user area (dashboard, registrations)
- Admin panel:
  - Programs CRUD and configuration
  - Dynamic form builder (individual, family head, family member)
  - Registrations and user management
  - Resources management and notifications
- Supabase-first backend with RLS and SSR auth integration
- Optional payments via Flutterwave webhook
- Optional transactional email via Resend

## Security and RLS Strategy (Summary)

When an operation is user-scoped (reading/updating own data), use the client Supabase instance with anon key and ensure RLS policies allow access. For admin operations (editing programs, forms, plans, users, or any auth.users relationship), never call Supabase directly from the client. Instead:

1) Frontend: call a secure API route (e.g., /api/admin/...)
2) API route:
   - Verify the requester is authenticated and has an admin role using a server-side Supabase client and cookies
   - Use the Supabase service role key on the server to perform the privileged action
   - Whitelist allowed fields and handle errors with proper status codes

Required env vars for this pattern:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

See docs/RLS-PERMISSION-ALGORITHM.md for the full algorithm and templates.

## Database Overview

- profiles — Linked to auth.users; stores role (student/admin/teacher), contact and preferences; auto-created via trigger
- programs — Public program catalog (RLS read-all; admin write)
- program_forms — JSON schema storage for registration forms (individual/family variants)
- enrollments — Tracks user enrollments, status, payment state, and family groups
- course_* tables — Legacy/alternative course structure (RLS policies present)
- resources — Downloadable assets managed by admins
- Triggers and policies enforce RLS across tables; helper is_admin(uid) centralizes admin checks

## Scripts

- node scripts/check-and-seed-forms.js — Ensures each program has required forms and plans; seeds missing entries
- node scripts/verify-registration-flow.js — Validates that programs, plans, and forms are in place and summarizes readiness

## Development

- Run dev: npm run dev (Turbopack)
- Lint: npm run lint
- Build: npm run build, then npm start
- The app uses the App Router (src/app) and TypeScript with strict settings
- Tailwind scans src/app, src/components, and src/pages patterns

## Deployment

- Works on Vercel or any Node host. Ensure environment variables are configured and remote image domains in next.config.ts allow your asset hosts (e.g., Supabase Storage).

---

This master README consolidates the original README and internal docs to enable AI assistants and contributors to continue development confidently. If anything is unclear or you need additional details surfaced from the codebase, open an issue or ask for a deeper dive into specific modules.
