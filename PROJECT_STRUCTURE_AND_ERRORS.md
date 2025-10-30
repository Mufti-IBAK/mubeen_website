## Project: Mubeen Website — Complete Structure and Error Audit

This document is a complete, runnable-level description of the repository layout, configuration, scripts, runtime contracts, and a detailed audit of likely lint, type, and accessibility (screen reader) issues discovered from a static read of the codebase. Read this file end-to-end and you should have the information needed to re-implement or port this project to another base.

---

## Table of contents

- High-level summary
- Folder-by-folder structure (with purpose and key files)
- Important configs and developer contract (scripts, env vars, dependencies)
- TypeScript/typing contract and important types
- Lint and type-check instructions (how to run locally)
- Observed / likely problems (lint, type, runtime)
- Accessibility (screenreader) audit and actionable fixes
- Quick checklist for porting and running the app
- Next steps and recommended improvements

---

## High-level summary

- Framework: Next.js 15 (App Router), React 19, TypeScript
- Styling: Tailwind CSS (with plugins @tailwindcss/forms and typography), PostCSS
- Backend: Supabase (auth + Postgres + storage). Uses a mixture of client and server API routes.
- State: Zustand
- Validation: Zod
- Payments: Flutterwave webhook present

The app provides a public marketing site (program listings, resources), an authenticated student dashboard, and a full-featured admin panel for program/form/user/notification management. Many DB policies and seed scripts are included under `supabase/`.

---

## Folder-by-folder structure (walkthrough)

Top-level notable files and folders:

- `package.json` — scripts and dependency manifest
- `tsconfig.json` — TypeScript configuration and path alias `@/* => ./src/*`
- `next.config.js` / `next.config.ts` — Next configuration (image remotePatterns, eslint build option)
- `tailwind.config.js` and `postcss.config.js` — Tailwind and PostCSS
- `supabase/` — DB schema, seeds, and migration helper scripts
- `scripts/` — Node scripts to seed/verify forms and registration pipeline
- `src/` — application source

src/ (key subfolders)

- `src/app/` — Next App Router routes and layouts

  - `layout.tsx` — root layout (imports `Header`, `Footer`, `SignUpModal`, `Toaster`, sets fonts)
  - `page.tsx` — home page server component fetching testimonials and quotes
  - route folders: `about/`, `login/`, `register/`, `dashboard/`, `admin/`, `programs/`, `resources/`, `api/` etc.

- `src/components/` — shared React components

  - `Header.tsx`, `Footer.tsx`, `RegistrationForm.tsx`, `SignUpModal.tsx`, `TestimonialSlider.tsx`, `FormBuilder/` etc.

- `src/lib/` — utility code

  - `supabaseClient.ts` — supabase client maker and safe stub
  - `store.ts` — Zustand store
  - `utils.ts`, `imageData.ts` — helper utilities

- `src/hooks/` — e.g., `useDraftRegistration.ts`
- `src/types/` — top-level types (e.g., `index.ts`)

Other folders:

- `docs/` — design and RLS docs (e.g., `RLS-PERMISSION-ALGORITHM.md`)
- `public/` — static assets and `patterns/` images

Files created/edited during audit: none (this is a documentation file only).

---

## Important configs and developer contract

package.json (summary)

- scripts:

  - `dev` — `next dev --turbopack`
  - `build` — `next build`
  - `start` — `next start`
  - `lint` — `next lint`

- notable dependencies (high level): next@15, react@19, typescript@5, supabase-js, @supabase/ssr, tailwindcss, zustand, zod, gsap, embla carousel, resend

TypeScript config (high level)

- `strict: true` is set. Other options include `noEmit: true`, `jsx: preserve`, `moduleResolution: bundler`, `paths` alias `@/*` to `src/*`.

ESLint

- `eslint.config.mjs` extends `next/core-web-vitals` and `next/typescript` via `FlatCompat` from `@eslint/eslintrc`.
- Note: `next.config.js` sets `eslint.ignoreDuringBuilds = true`, meaning production builds will not fail for lint errors — this is a deliberate decision with the project, but it masks lint problems during deploys.

Next config

- `next.config.{js,ts}` configures remote image hosts (Pexels and a Supabase storage hostname). Ensure the correct hostname for Supabase storage is present for your project.

Environment variables (required at minimum)

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — server-only service role key (used in secure API routes)
- Optional: `RESEND_API_KEY` for transactional mail

Developer contract: what the app expects when you run it

- Node 18+ installed
- A Supabase project with schema applied (see `supabase/schema.sql`)
- .env.local with the environment variables above
- `npm install` then `npm run dev`

---

## TypeScript / Typing contract (inputs, outputs, error modes)

Overview (2–4 bullet contract):

- Inputs: UI routes receive user input from forms (registration forms use JSON schema in `program_forms`). API routes accept JSON bodies authenticated via cookies/session.
- Outputs: pages render React trees; API routes return JSON (status codes 200/4xx/5xx). Server routes that perform admin actions must return clear success/failure payloads and use service-role credentials.
- Data shapes: DB schemas are defined in `supabase/schema.sql` and the TypeScript `src/types/index.ts` mirrors key shapes (profiles, programs, enrollments). When creating a port, ensure those types match DB.
- Error modes: network failures, missing env vars, and RLS permission errors are common. API routes should map Supabase errors to descriptive HTTP codes.

Edge cases to handle:

1. Missing or undefined env vars -> app should fail fast with clear error message.
2. Null data from Supabase (data === null) -> handle gracefully in server components (present empty arrays).
3. Race conditions on front-end auth state -> useSupabase onAuth listeners and handle unmounting cleanup.

---

## How to run lint and typecheck (locally)

Run these locally in a terminal (PowerShell / Windows):

```powershell
npm install
# Run ESLint (project script)
npm run lint

# Run TypeScript check (no emit)
npx tsc --noEmit

# Optional: run a production test build (this will respect next.config.js config)
npm run build
```

Note: `next.config.js` currently sets `eslint.ignoreDuringBuilds: true`, so `npm run build` will not fail on ESLint issues. To enforce lint errors in CI you should remove or toggle that flag.

I attempted to run the linter and tsc as part of this audit from the environment used to generate this file, however command output was not available to me here. Please run the commands above locally to capture exact lists of current errors and warnings — the rest of this file documents likely problems and concrete locations.

---

## Observed / likely problems (lints, types, runtime) — prioritized

I inspected source files and config statically and listed concrete, reproducible issues and recommended fixes. Each issue includes: location, why it matters, and suggested fix.

1. package.json typo

- Location: `package.json` top-level `name` field currently: `"mubeen_wesite"`
- Why: Typo, minor but may confuse package registries or tooling that reads package name.
- Fix: Correct to `"mubeen_website"`.

2. ESLint suppressed during build

- Location: `next.config.js` has `eslint.ignoreDuringBuilds = true`.
- Why: This prevents builds from failing on lint issues. Good for unblocking deploys, but hides problems that should be fixed.
- Fix: Remove or make this conditional (e.g., only ignore in preview branches). CI should run `npm run lint` and fail on errors.

3. supabaseClient stub typing and server/client usage

- Location: `src/lib/supabaseClient.ts`
- Why: The module exports `supabase` that is either a real `createClient()` instance or a stub object typed as `any`. With `strict: true` this may produce unsafe `any` usage across the app. Also, using the client `createClient()` in server components is fine with supabase-js v2, but ensure server routes that need service-role keys use a separate server-only client.
- Fixes:
  - Make the stub typed (export an explicit interface) to reduce implicit any leak.
  - Consider splitting into `supabaseClient.ts` (client) and `supabaseServer.ts` (server-only client using service role when available).

4. Potential missing ARIA/focus management in mobile menu

- Location: `src/components/Header.tsx`
- Why: The mobile menu toggles with `isMenuOpen`, but the DOM doesn't use `aria-expanded` on the menu button nor set `aria-hidden` on the menu when closed (and there's no focus trap). Screen reader or keyboard users may not be able to navigate properly.
- Fix:
  - Add `aria-expanded={isMenuOpen}` to the menu toggle button.
  - When the mobile menu is open, set `role="dialog"` and `aria-modal="true"` on the container and trap focus within it. Restore focus to the toggle button on close.
  - Add `tabIndex={-1}` to background content or set `inert` where supported.

5. Mobile menu: menu button should set accessible label and state

- Location: `Header.tsx` menu button has `aria-label="Open navigation menu"` but does not toggle label to “Close navigation menu” when open; it also lacks `aria-controls` linking to the menu region.
- Fix: update `aria-label` based on state and add `aria-controls="mobile-menu"` and give the mobile menu `id="mobile-menu"`.

6. Images and alt text — general guidance

- Observed: Main logo `<Image src="/logo.png" alt="Mubeen Academy Logo" .../>` has alt text — good. Many images are in `public/patterns` and other components; confirm each `Image` or `<img>` has meaningful `alt` (or empty string for decorative images).
- Fix: Ensure decorative images use `alt=""` and content images have descriptive variants for screen readers.

7. Client/server component mismatches

- Example: `src/app/layout.tsx` imports `SignUpModal`, `Toaster`, and `Header` / `Footer` — confirm these are client components (i.e., begin with `"use client"`) where they use state/hooks. If not, Next will throw errors about client-only hooks in server components.
- Fix: Ensure every component that uses hooks or browser-only APIs includes `"use client"` at the top and is only imported by server components as client components (this is legal). If a component is purely presentational, keep it server-safe.

8. Unhandled supabase/network errors in pages

- Location: `src/app/page.tsx` — server component fetches testimonials and quotes using `supabase.from(...).select('*')` and assigns `const testimonials = testimonialsResult.data as Testimonial[] | null;` but does not handle `testimonialsResult.error` explicitly.
- Fix: Check `if (testimonialsResult.error)` and handle gracefully (log server-side or show a UI fallback) before casting `data`.

9. Potential missing dependency typings

- Several deps (gsap react hook `useGSAP`, embla, etc.) may not provide complete TypeScript types at runtime and can cause lint/type warnings. The code imports `useGSAP` from `@gsap/react`. Ensure `@types/...` or the package includes types.
- Fix: Install missing `@types/` packages or declare minimal ambient types for third-party libs that lack types.

10. Duplicate next.config files / confusion

- Both `next.config.js` and `next.config.ts` are present. Next will pick up `.js` by default — the `.ts` file is likely a draft. Keep a single authoritative config to avoid confusion.
- Fix: Remove or consolidate into one file format supported by your deployment environment.

11. Accessibility: Skip link absent

- Location: `src/app/layout.tsx` — I did not observe a "Skip to content" link in the root layout. This is helpful for keyboard users.
- Fix: Add a skip link (visually-hidden until focused) at top of body linking to `main`.

12. ARIA on social icons

- Location: `Footer.tsx` social icons use `<a>` with an inline SVG but do not include `aria-label` or screen reader text.
- Fix: Add `aria-label` like `aria-label="Mubeen on Facebook"` or include visually-hidden text inside the anchor.

13. Potential missing dependencies for dev

- Confirm presence of `@types/*` for node/react/react-dom (package.json includes `@types/node`, `@types/react`, `@types/react-dom` — good). Additional `@types/gsap` may be missing; check linter output.

---

## Accessibility (screen reader) audit — detailed

Below are specific accessibility points with recommended fixes and reference lines where applicable (based on static file inspection):

1. Focus management and dialog semantics (Header mobile menu)

- Problem: When mobile menu opens there is no `aria-modal`, no focus trap, and no restore focus when closing.
- Why: Keyboard and screen reader users may be trapped or lose context.
- Fix (concrete): Turn the mobile menu into an accessible dialog:
  - Give the menu container `role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title" id="mobile-menu"`
  - When opened, set focus to the first focusable element in the menu. On close, return focus to the toggle button.
  - Add `aria-expanded` to the toggle button and `aria-controls="mobile-menu"`.

2. Skip link

- Add an early-in-dom skip link: `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>` and mark `<main id="main-content">` for the layout.

3. Button labels & state

- Menu toggle: currently has `aria-label="Open navigation menu"` but should toggle to "Close navigation menu" when open and reflect `aria-expanded`.
- Social links: Add `aria-label` to each social icon anchor.

4. Color contrast / theming

- Colors are driven by CSS variables and Tailwind tokens. Verify foreground/background contrast meets WCAG AA for body text, buttons, and interactive elements. Use automated tools (axe, Lighthouse) to detect contrast issues.

5. Images

- Ensure decorative images are `alt=""` and content images have descriptive alternate text.

6. Headings and structure

- Ensure logical heading structure (H1-H2-H3) across pages; the `Hero` components and sections should use semantically meaningful heading tags.

---

## Quick checklist for porting / reproducing this app in another base

1. Clone repo.
2. Install dependencies: `npm install`.
3. Set environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (and `RESEND_API_KEY` if used).
4. Create or reuse a Supabase project and run `supabase/schema.sql` and any applicable seeds from `supabase/`.
5. Run `npm run dev` and open `http://localhost:3000`.
6. Run `npm run lint` and `npx tsc --noEmit` and fix reported issues.

---

## Next steps & recommended improvements (priority order)

1. Run `npm run lint` and `npx tsc --noEmit` locally and fix errors (update this file with the exact outputs once you have run them).
2. Implement accessible mobile menu changes (aria-expanded, role=dialog, focus trap) and add a skip link.
3. Separate client and server Supabase clients to make server-only operations use the service role explicitly.
4. Remove `eslint.ignoreDuringBuilds` or limit it; ensure CI checks `npm run lint` and fails on problems.
5. Add an automated accessibility test (axe-core or Playwright + Axe) in CI.

---

## How I validated this document

- I read the top-level config files: `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.js/ts`, `tailwind.config.js`, and several key components in `src/app` and `src/components`.
- I attempted to run `npm run lint` and `npx tsc --noEmit` from the environment used to create this file; no console output was available in that run. Please run those commands locally to get the canonical list of problems. I included likely issues by reading code paths and following best practices.

---

If you want, I can now:

- Run the lint and typecheck locally (if you allow me to run them and provide the output) and append exact outputs into this document.
- Produce a small PR that implements the highest-impact fixes (fix package name, add aria-expanded and aria-controls to the header, add skip-link and basic focus restore for mobile menu, and split supabase clients).

Tell me which of the next steps you'd like me to take and I'll proceed.
