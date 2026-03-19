---
phase: 01-foundation
plan: "03"
type: execute
wave: 2
depends_on: ["01-01"]
files_modified:
  - src/lib/supabase/client.ts
  - src/lib/supabase/server.ts
  - src/types/supabase.ts
  - middleware.ts
autonomous: true

must_haves:
  truths:
    - "Visiting /Products (uppercase P) redirects to /products with 307 status"
    - "Visiting /CATALOG/GOLD-BEADS redirects to /catalog/gold-beads"
    - "Lowercase URLs are not redirected (e.g. /about stays /about)"
    - "createClient() from src/lib/supabase/server.ts is importable in Server Components without errors"
    - "createClient() from src/lib/supabase/client.ts is importable in Client Components without errors"
    - "src/types/supabase.ts exists and exports a Database type (stub acceptable until schema is migrated)"
  artifacts:
    - path: "middleware.ts"
      provides: "Lowercase URL redirect + Supabase session refresh"
      contains: "pathname.toLowerCase()"
    - path: "src/lib/supabase/server.ts"
      provides: "Async server-side Supabase client factory"
      contains: "await cookies()"
    - path: "src/lib/supabase/client.ts"
      provides: "Browser-side Supabase client factory"
      contains: "createBrowserClient"
    - path: "src/types/supabase.ts"
      provides: "TypeScript Database type for Supabase client generics"
      exports: ["Database"]
  key_links:
    - from: "middleware.ts"
      to: "src/lib/supabase/server.ts"
      via: "Both use @supabase/ssr createServerClient; middleware handles cookie writes; server.ts handles reads"
      pattern: "createServerClient"
    - from: "src/lib/supabase/server.ts"
      to: "src/types/supabase.ts"
      via: "createServerClient<Database>() generic parameter"
      pattern: "createServerClient<Database>"
    - from: "src/lib/supabase/client.ts"
      to: "src/types/supabase.ts"
      via: "createBrowserClient<Database>() generic parameter"
      pattern: "createBrowserClient<Database>"
---

<objective>
Wire Supabase's typed client pair (server + browser) and configure the combined middleware that handles both lowercase URL enforcement and Supabase session refresh.

Purpose: All subsequent phases require Supabase data access. The middleware must be in place from the first commit so every URL created after this plan automatically conforms to SEO-04 (lowercase slugs). These two concerns share one middleware file and must be built together to avoid conflicts.
Output: middleware.ts, src/lib/supabase/server.ts, src/lib/supabase/client.ts, src/types/supabase.ts (stub).
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mac/Documents/GitHub/twinkle/.planning/PROJECT.md
@/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-RESEARCH.md
@/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-01-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Supabase client pair and TypeScript types stub</name>
  <files>
    src/lib/supabase/server.ts
    src/lib/supabase/client.ts
    src/types/supabase.ts
  </files>
  <action>
Create `src/lib/supabase/server.ts` — async factory for Server Components, Route Handlers, and Server Actions:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()  // MUST be awaited in Next.js 15

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot write cookies.
            // Token refresh is handled by middleware — this catch is intentional.
          }
        },
      },
    }
  )
}
```

Create `src/lib/supabase/client.ts` — factory for Client Components:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

Create `src/types/supabase.ts` — stub that satisfies the generic constraint. This will be replaced by a generated file when the Supabase project is connected and the schema is defined (planned for Phase 3 when products table exists):

```typescript
// This file will be replaced by running:
//   npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" --schema public > src/types/supabase.ts
// Do not edit manually once generated.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Helper type for extracting row types (will work once tables are added)
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
```

Delete the `.gitkeep` file from `src/lib/supabase/` if it exists:

```bash
rm -f /Users/mac/Documents/GitHub/twinkle/src/lib/supabase/.gitkeep
rm -f /Users/mac/Documents/GitHub/twinkle/src/types/.gitkeep
```
  </action>
  <verify>
```bash
cd /Users/mac/Documents/GitHub/twinkle
npx tsc --noEmit
```
Should exit 0 — both client files type-check cleanly with the Database stub.

Also verify:
```bash
grep "await cookies()" src/lib/supabase/server.ts
```
Should return a match (confirms async cookies() is used, not synchronous).
  </verify>
  <done>
server.ts uses `await cookies()` and createServerClient<Database>. client.ts uses createBrowserClient<Database>. types/supabase.ts exports Database interface. TypeScript passes with no errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create combined middleware (lowercase redirect + Supabase session refresh)</name>
  <files>
    middleware.ts
  </files>
  <action>
Create `middleware.ts` at the project root (next to package.json, not inside src/):

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // ── Step 1: Lowercase URL redirect (SEO-04) ──────────────────────────────
  // Redirects any URL with uppercase letters to its lowercase equivalent.
  // Example: /Products → /products, /CATALOG/Gold-Beads → /catalog/gold-beads
  const { pathname, search, origin } = request.nextUrl
  if (pathname !== pathname.toLowerCase()) {
    return NextResponse.redirect(
      new URL(origin + pathname.toLowerCase() + search)
    )
  }

  // ── Step 2: Supabase session refresh ──────────────────────────────────────
  // Must run on every request (except static assets — see matcher below).
  // Creates a response object that middleware can attach cookies to.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write to the request (for downstream middleware/routes)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Re-create response to ensure cookies are written to it
          supabaseResponse = NextResponse.next({ request })
          // Write to the response (returned to the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session. Must be called before any auth-dependent logic.
  // getClaims() validates the JWT signature (unlike getSession() which does not).
  await supabase.auth.getClaims()

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Static file extensions (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

IMPORTANT notes embedded in the code comments:
- `pathname.toLowerCase()` check runs FIRST, before Supabase session. This means uppercase URL requests are redirected immediately without creating a Supabase client (efficient).
- `await supabase.auth.getClaims()` — NOT `getSession()`. getClaims validates JWT server-side; getSession trusts the client without verification.
- The matcher excludes static files to prevent performance degradation (see RESEARCH.md Pitfall 5).

Commit both tasks together:

```bash
git add src/lib/supabase/server.ts src/lib/supabase/client.ts src/types/supabase.ts middleware.ts
git commit -m "feat(01): add Supabase SSR client pair, types stub, and combined middleware"
```
  </action>
  <verify>
Start dev server and test URL normalisation:

```bash
npm run dev
```

In a new terminal or browser, test redirect behavior:

```bash
# These should redirect (307) to their lowercase equivalents:
curl -I http://localhost:3000/Products
# Expected: HTTP/1.1 307 Temporary Redirect, Location: http://localhost:3000/products

curl -I http://localhost:3000/ABOUT
# Expected: 307 redirect to /about

# These should NOT redirect:
curl -I http://localhost:3000/
# Expected: 200 (no redirect)

curl -I http://localhost:3000/about
# Expected: 404 (no redirect — the page doesn't exist yet, but it's not being redirected)
```

Also run TypeScript check to confirm no new errors:

```bash
npx tsc --noEmit
```
  </verify>
  <done>
middleware.ts exists at project root with the matcher config. Uppercase URL test returns 307 redirect to lowercase equivalent. Lowercase URL test returns 200 or 404 (not redirected). TypeScript check passes. Both Supabase client files importable.
  </done>
</task>

</tasks>

<verification>
Complete verification after both tasks:

1. `curl -I http://localhost:3000/Products` — returns 307, Location: /products
2. `curl -I http://localhost:3000/about` — returns 200 or 404, NOT a 307
3. `npx tsc --noEmit` — exits 0
4. `grep "await cookies()" src/lib/supabase/server.ts` — returns match
5. `grep "getClaims" middleware.ts` — returns match (confirms getClaims not getSession)
6. `grep "pathname.toLowerCase" middleware.ts` — returns match
7. `npm run build` — exits 0
</verification>

<success_criteria>
- Uppercase URLs redirect to lowercase (SEO-04 enforcement active from first commit)
- Lowercase URLs pass through without redirect
- Supabase server client uses async cookies() (Next.js 15 compliant)
- Supabase browser client importable in Client Components
- TypeScript types stub exports Database interface
- Combined middleware runs without errors
- Build passes
</success_criteria>

<output>
After completion, create `/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-03-SUMMARY.md`
</output>
