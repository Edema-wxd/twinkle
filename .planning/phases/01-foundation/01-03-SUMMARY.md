---
plan: "01-03"
status: complete
commit: fa336c5
---

## What was built

Supabase SSR client pair (server + browser), TypeScript Database type stub, and combined middleware for lowercase URL enforcement + session refresh.

## Tasks completed

1. Created `src/lib/supabase/server.ts` — async server-side client factory using `await cookies()` (Next.js 15 compliant) and `createServerClient<Database>`
2. Created `src/lib/supabase/client.ts` — browser-side factory using `createBrowserClient<Database>`
3. Created `src/types/supabase.ts` — Database interface stub (will be replaced when schema is migrated in Phase 3)
4. Created `middleware.ts` — combined: (1) lowercase URL redirect runs first for efficiency, (2) Supabase session refresh via `getClaims()` (not `getSession()`)

## Key decisions

- `getClaims()` used in middleware (validates JWT server-side) — not `getSession()` which trusts client without verification
- Lowercase redirect runs before Supabase client instantiation — avoids creating client for redirected requests
- Middleware matcher excludes static assets to prevent performance degradation

## Verification

- `npx tsc --noEmit`: PASSED (exit 0)
- `grep "await cookies()"`: match in server.ts
- `grep "getClaims"`: match in middleware.ts
- `grep "pathname.toLowerCase"`: match in middleware.ts
