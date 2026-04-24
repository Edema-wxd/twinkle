<!-- generated-by: gsd-doc-writer -->
# Development

This document covers everything needed to work on the Twinkle Locs codebase after the initial setup described in GETTING-STARTED.md.

---

## Local Setup

1. Fork and clone the repository, then install dependencies:

```bash
git clone https://github.com/<your-fork>/twinkle.git
cd twinkle
npm install
```

2. Copy the environment variable template and fill in real values:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and set all required variables. See [CONFIGURATION.md](CONFIGURATION.md) for the full list and where to find each value.

3. Start the development server:

```bash
npm run dev
```

The storefront is available at `http://localhost:3000`. The admin panel is at `http://localhost:3000/admin`.

> To test the Paystack webhook locally you will need a tunnelling tool such as `ngrok` pointed at `http://localhost:3000` and the webhook URL configured in your Paystack Dashboard. Use Paystack test keys (not live keys) during local development.

---

## Build Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server with hot reload |
| `npm run build` | Compile a production build (runs `next build`) |
| `npm run start` | Serve the production build locally (run `npm run build` first) |
| `npm run lint` | Run ESLint using the Next.js ESLint configuration |

---

## Code Style

**ESLint** is used for linting via `eslint-config-next` (ESLint 9). There is no separate config file — Next.js applies its recommended ruleset automatically.

Run the linter:

```bash
npm run lint
```

**TypeScript** strict mode is enabled (`"strict": true` in `tsconfig.json`). The compiler is set to `noEmit` — type errors are caught at build time, not emitted as JavaScript. Always resolve TypeScript errors before opening a PR.

**Tailwind CSS v4** is used for styling via `@tailwindcss/postcss`. There is no separate `tailwind.config.*` file; Tailwind v4 scans `src/` automatically. Keep styles co-located with their components — avoid global utility classes in `globals.css` unless they apply site-wide.

There is no Prettier or Biome config in the repository. Formatting is not enforced by tooling; follow the style of the files you are editing.

---

## Project Conventions

### Path aliases

The `@/*` alias maps to `src/*`. Always use this alias for imports rather than relative paths that cross directory boundaries:

```typescript
// Good
import { createClient } from '@/lib/supabase/server'

// Avoid
import { createClient } from '../../../lib/supabase/server'
```

### Supabase client selection

| Client factory | File | When to use |
|---|---|---|
| `createClient` (server) | `src/lib/supabase/server.ts` | Server Components, API Route handlers, middleware |
| `createClient` (browser) | `src/lib/supabase/client.ts` | Client Components that need real-time or auth on the browser |
| `createAdminClient` | `src/lib/supabase/admin.ts` | API routes that need privileged writes; **never import in client components** |

### Business constants

WhatsApp number, Instagram handle, and support email are centralised in `src/lib/config/business.ts`. Do not hardcode these values elsewhere.

### Database migrations

SQL migration files live in `supabase/migrations/`. Name new migration files using the date prefix format `YYYYMMDD_description.sql` to match existing files:

- `20260323_orders.sql`
- `20260402_abandoned_orders.sql`

Apply migrations through the Supabase Dashboard SQL Editor or the Supabase CLI.

### Route groups

- `(admin)` — admin pages with the full-screen sidebar layout, isolated from storefront chrome
- `(shop)` / `(marketing)` — storefront pages sharing the header/footer layout

Admin-only components live in `src/app/(admin)/_components/` and must not be imported by storefront pages.

---

## Branch Conventions

No formal branch naming convention is documented. No `.github/` directory or PR template exists in the repository.

Suggested practice: use short descriptive branch names prefixed with the type of change, for example `feat/admin-order-filters` or `fix/webhook-signature-check`.

---

## PR Process

No pull request template is configured. When opening a PR:

- Describe what changed and why, not just what files were touched.
- Confirm `npm run lint` passes with no errors.
- Confirm `npm run build` completes without TypeScript errors.
- Test both the storefront and the admin panel if changes touch shared code (middleware, Supabase clients, cart context).
- For payment-related changes, test with Paystack test keys and a locally tunnelled webhook before merging.
