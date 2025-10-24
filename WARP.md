# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project summary
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS + PostCSS
- Supabase for auth/data; env-driven client with a safe stub when env is missing (see src/lib/supabaseClient.ts)
- Zustand for lightweight state (see src/lib/store.ts)

Commands
- Install deps
  ```bash path=null start=null
  npm install
  ```
- Dev (Turbopack)
  ```bash path=null start=null
  npm run dev
  ```
- Lint
  ```bash path=null start=null
  npm run lint
  ```
- Build and launch
  ```bash path=null start=null
  npm run build
  npm start
  ```
- Typecheck (no package script defined)
  ```bash path=null start=null
  npx tsc --noEmit
  ```
- Database helper scripts (optional; see scripts/)
  ```bash path=null start=null
  node scripts/check-and-seed-forms.js
  node scripts/verify-registration-flow.js
  ```
- Tests
  - No test runner is configured in package.json.

Environment
- Copy .env.example to .env.local and set at least:
  ```env path=null start=null
  NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
  SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
  # Optional
  RESEND_API_KEY=<resend_api_key>
  ```

Supabase database
- The README references SQL in supabase/ (e.g., schema.sql and seed/fix scripts). Apply them in your Supabase project as needed, then run the provided node scripts above to seed/verify the registration pipeline.

Architecture overview (big picture)
- App Router: The UI lives under src/app. Root layout (src/app/layout.tsx) wires global fonts, header/footer, a sign-up modal, toast provider, and includes the Flutterwave checkout script. Home page (src/app/page.tsx) is a server component that fetches data from Supabase and composes Hero/Core Values/Testimonial sections.
- Data layer: src/lib/supabaseClient.ts creates the client from NEXT_PUBLIC_* env vars; if missing, a stub prevents dev-time crashes by returning structured "not configured" responses. This lets SSR/client code import a single supabase instance safely.
- State: src/lib/store.ts defines a small Zustand store (e.g., SignUpModal visibility) used by components like src/components/SignUpModal.tsx.
- Drafts UX: src/hooks/useDraftRegistration.ts provides autosave/manual-save/finalize/delete flows against an /api/drafts endpoint, with toast feedback and beforeunload saves. Integrate by calling the hook in form flows and wiring updateFormData.
- Styling: Tailwind configured via tailwind.config.js and postcss.config.js. Tailwind scans src/app, src/components, and src/pages. Fonts and theme variables are applied at the layout level.
- Config:
  - tsconfig.json sets strict TS and path alias @/* → ./src/*.
  - eslint.config.mjs extends next/core-web-vitals (+ next/typescript). .eslintrc.json adds a few rule tweaks. next.config.js currently ignores ESLint errors during builds to unblock deploys; re-enable once issues are fixed.
  - next.config.(js|ts) configures remote image domains (Pexels and your Supabase Storage host) for next/image.

What’s in README.md (essentials)
- Quick Start: install, set env, apply Supabase SQL, optional seeding/verification, run dev.
- Key features: public site, authenticated dashboard, and admin-facing capabilities for programs/forms/resources/notifications (check the repo for the specific routes you need; implementation may be incremental).
- Security model: user-scoped ops use anon client honoring RLS; admin ops should go through server routes using the service-role key and role checks.

Notes for future agents
- Prefer importing from @/* using the tsconfig path alias.
- When adding data access, follow the RLS pattern: anon client for user-owned reads/writes; server route + service role for privileged/admin actions.
- If images fail to load, verify the remotePatterns in next.config.(js|ts) include the host.
