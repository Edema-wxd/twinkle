# Twinkle Locs — Claude Code Guide

E-commerce storefront for Twinkle Locs, a Nigerian loc bead accessories brand. Built with Next.js 15 App Router + Neon Postgres + Drizzle ORM + better-auth + Paystack.

## Key facts

- **Owner:** Unoma (store owner), Woods (developer)
- **Guest checkout only** — no customer accounts in v1
- **International shipping** = WhatsApp contact-for-quote flow, not automated
- **Admin panel** is built into the app at `/admin` (not a separate service)

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | Neon Postgres via `@neondatabase/serverless` |
| ORM | Drizzle ORM — schema at `src/db/schema.ts` |
| Auth | better-auth — session checked via `auth.api.getSession()` in server components/API routes |
| Payments | Paystack (`@paystack/inline-js`) — webhook at `/api/paystack/webhook` |
| File uploads | UploadThing — router at `src/app/api/uploadthing/` |
| Email | Resend — sent from API routes, not server components |
| Rich text | Tiptap (blog editor) |
| Drag & drop | dnd-kit (admin product sorting) |
| Testing | Vitest + Testing Library |

## Project structure

```
src/
  app/
    (shop)/          # Customer-facing storefront routes
    (admin)/         # Admin panel routes (auth-protected layout)
    (marketing)/     # Static/marketing pages
    api/             # API route handlers
  db/
    schema.ts        # Drizzle table definitions — single source of truth
    index.ts         # DB client (Neon serverless pool)
  lib/               # Shared utilities, auth config, constants
  components/        # Shared UI components
docs/                # Extended docs (architecture, API, configuration, testing)
drizzle/             # Generated migration SQL files
```

## Auth

- **Library:** better-auth
- **Middleware** (`middleware.ts`) does a fast cookie-presence check at the Edge — it is NOT the authoritative session check
- **Authoritative check:** `auth.api.getSession()` called in protected layouts and every API route
- **First run:** create admin at `/admin/setup`; subsequent logins at `/admin/login`

## Database workflow

```bash
npx drizzle-kit push          # apply schema to dev DB (no migration files)
npx drizzle-kit generate      # generate migration SQL (for prod)
npx drizzle-kit migrate       # apply pending migrations
```

Schema changes go in `src/db/schema.ts` only — never hand-edit migration SQL.

## Payments (Paystack)

- Checkout is initialised client-side with `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- Payment confirmation happens via a signed webhook (`PAYSTACK_SECRET_KEY`) at `/api/paystack/webhook`
- Order status is written to the DB only after webhook verification — never trust client-side confirmation alone

## Design system

- **Fonts:** Halimun (hero/display), Raleway (body), Inter (UI) — all self-hosted under `public/fonts/`
- **Palette:** deep gold, cocoa, cream, forest green, terracotta — defined as CSS custom properties in `globals.css`
- **Aesthetic:** Afro-luxury + Bold Cultural

## Common commands

```bash
npm run dev              # dev server
npm run build            # production build
npm run lint             # ESLint
npm run test:run         # run all tests once
npm run test:coverage    # coverage report
```

## Docs

Extended documentation lives in `docs/`:

- `docs/GETTING-STARTED.md` — full local setup walkthrough
- `docs/ARCHITECTURE.md` — system diagram and data flow
- `docs/API.md` — API route reference
- `docs/CONFIGURATION.md` — env var details
- `docs/DEVELOPMENT.md` — dev workflow and conventions
- `docs/TESTING.md` — testing strategy and patterns
