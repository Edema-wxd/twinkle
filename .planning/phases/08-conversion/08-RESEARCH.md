# Phase 8: Conversion - Research

**Researched:** 2026-03-28
**Domain:** Newsletter signup — Supabase INSERT, Next.js API route, client island form in Footer
**Confidence:** HIGH — all findings drawn from the live codebase and established patterns

---

## Summary

Phase 8 adds a newsletter signup column to the existing Footer. Visitors submit their first name and email; the data is stored in a new `newsletter_subscribers` Supabase table. The form lives in a `'use client'` island component embedded inside the otherwise-Server-Component Footer. An API route at `/api/newsletter/subscribe` handles validation, insert, and duplicate detection.

All three concerns (database, API route, form component) follow patterns that already exist in the codebase. There is no new dependency required.

**Primary recommendation:** The implementation is four discrete units — SQL migration, TypeScript type addition, API route, NewsletterForm island — wired together by importing NewsletterForm into the Footer.

---

## Standard Stack

The established stack for this phase is the project's existing stack. No new libraries are needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | existing | DB insert via `createAdminClient()` | Already used for all server-side writes |
| Next.js App Router | 15 | API route at `/api/newsletter/subscribe` | Project framework |
| React `useState` | existing | Form state, loading flag, feedback message | Already used in every client island |
| Tailwind CSS v4 | existing | Styling via `@theme` design tokens | Project CSS system |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `usePathname` (next/navigation) | existing | Capture `source_page` in client island | Available because component is `'use client'` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `createAdminClient()` in API route | Supabase anon key with RLS public INSERT | RLS public INSERT works but service role is simpler and consistent with every other write in the project |

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/layout/
│   ├── Footer.tsx              # existing — add <NewsletterForm /> import
│   └── NewsletterForm.tsx      # NEW — 'use client' island
└── app/api/newsletter/
    └── subscribe/
        └── route.ts            # NEW — public POST endpoint
```

And two edits to existing files:
- `src/lib/supabase/schema.sql` — append newsletter_subscribers migration block
- `src/types/supabase.ts` — add `newsletter_subscribers` table type + `NewsletterSubscriber` convenience alias

### Pattern 1: Client Island Embedded in Server Component Footer

Footer.tsx stays a Server Component (no `'use client'` directive). It imports `NewsletterForm` which is a leaf `'use client'` component. React serialises the client boundary at that leaf.

This is the exact same pattern used for `FaqAccordion` (client) embedded in the FAQ page (server), and `FeaturedProductsSection` (client) embedded in the home page (server).

```typescript
// Footer.tsx — no change to file-level directives
import { NewsletterForm } from './NewsletterForm'

// Inside the JSX grid, add a fourth column:
<div>
  <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-cream/60 mb-4">
    Join the Twinkle family
  </h3>
  <NewsletterForm />
</div>
```

The Footer grid currently uses `grid-cols-1 md:grid-cols-3`. Adding a fourth column means changing to `md:grid-cols-4` (or keeping 3 and stacking the signup column below — planner decides layout details based on context decisions).

### Pattern 2: NewsletterForm Component Shape

```typescript
// Source: established codebase pattern — FaqAccordion, FeaturedProductsSection
'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

export function NewsletterForm() {
  const pathname = usePathname()
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: firstName, email, source_page: pathname }),
    })
    const json = await res.json()
    if (res.status === 409) setStatus('duplicate')
    else if (res.ok) setStatus('success')
    else setStatus('error')
  }
  // ...
}
```

### Pattern 3: Public POST API Route (No Auth Check)

Unlike admin routes, this endpoint is public — any visitor can call it. No `supabase.auth.getUser()` check. The route uses `createAdminClient()` because the `newsletter_subscribers` table will use RLS (anon cannot INSERT without a policy, and bypassing RLS with service role is simpler and consistent).

```typescript
// Source: established codebase pattern — /api/admin/faqs/route.ts adapted for public
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { first_name, email, source_page } = body as {
    first_name?: unknown
    email?: unknown
    source_page?: unknown
  }

  // Validate
  if (!first_name || typeof first_name !== 'string' || first_name.trim() === '') {
    return NextResponse.json({ error: 'first_name is required' }, { status: 400 })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'valid email is required' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('newsletter_subscribers')
    .insert({
      first_name: first_name.trim(),
      email: email.trim().toLowerCase(),
      source_page: typeof source_page === 'string' ? source_page : null,
    })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'already subscribed' }, { status: 409 })
    }
    console.error('Newsletter insert error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

### Pattern 4: Supabase Table SQL

```sql
-- Append to schema.sql (Phase 8 block)
create table public.newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  email         text not null unique,
  source_page   text,
  subscribed_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;
-- No SELECT policy — subscribers cannot read each other's data
-- No public INSERT policy — insert is done via service-role API route
```

### Pattern 5: TypeScript Type Addition in supabase.ts

```typescript
// Add inside Database['public']['Tables'] — follow exact shape of existing tables
newsletter_subscribers: {
  Row: {
    id: string
    first_name: string
    email: string
    source_page: string | null
    subscribed_at: string
  }
  Insert: Omit<Database['public']['Tables']['newsletter_subscribers']['Row'], 'id' | 'subscribed_at'> & {
    id?: string
    subscribed_at?: string
  }
  Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>
  Relationships: []
}

// Add convenience alias at the bottom with existing aliases
export type NewsletterSubscriber = Database['public']['Tables']['newsletter_subscribers']['Row']
```

### Anti-Patterns to Avoid

- **Adding `'use client'` to Footer.tsx:** Not needed. Only the leaf `NewsletterForm` needs it. Footer stays a Server Component.
- **Using `window.location.pathname` directly:** Not safe during SSR/hydration. Use `usePathname()` from `next/navigation` — it's available in `'use client'` components and is hydration-safe.
- **Inserting with anon Supabase client from the browser:** Would require a public INSERT RLS policy. Using the server-side API route with `createAdminClient()` is the established project pattern and avoids exposing RLS policy surface.
- **Using `req.headers.get('referer')` for source_page:** Referer header is unreliable and may be absent. `usePathname()` on the client is accurate and gives the current React route path.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email format validation | Custom regex | Native `input type="email"` + HTML5 validity + server-side `email.includes('@')` check | Browser handles format; server validates presence — sufficient for single opt-in |
| Duplicate detection | Manual SELECT before INSERT | Postgres unique constraint + catch error code `23505` | Atomic, no race condition |
| Client-side loading state | Complex async state machine | Single `status` enum: `'idle' \| 'loading' \| 'success' \| 'duplicate' \| 'error'` | Same pattern used in admin forms across the project |

**Key insight:** The unique constraint on `email` does the duplicate work atomically. Checking first with a SELECT creates a race condition and doubles round trips.

---

## Common Pitfalls

### Pitfall 1: Footer Grid Column Count

**What goes wrong:** Footer currently has `grid-cols-1 md:grid-cols-3`. Adding a fourth column without updating the grid class results in a squashed layout or wrapping.

**How to avoid:** Update the grid to `md:grid-cols-4` in Footer.tsx, or (per context decision) keep the form as a column at equal weight to the existing three.

**Warning signs:** On medium screens, the newsletter column appears below the other three or at half-width.

### Pitfall 2: usePathname Requires 'use client'

**What goes wrong:** Trying to call `usePathname()` in a Server Component throws an error because it's a React hook.

**How to avoid:** `usePathname()` is called inside `NewsletterForm.tsx` which is `'use client'`. Footer.tsx never calls it directly.

### Pitfall 3: Error Code 23505 Must Be Caught Explicitly

**What goes wrong:** Treating all Supabase errors as generic 500s causes the user to see "Failed to subscribe" instead of the friendly "already on the list" message.

**How to avoid:** Check `error.code === '23505'` before returning 500. This is already the established pattern in `/api/admin/blog/route.ts`.

### Pitfall 4: Email Normalisation

**What goes wrong:** `user@example.com` and `User@Example.COM` create duplicate rows if email is stored as-entered.

**How to avoid:** Store as `email.trim().toLowerCase()` in the API route. The unique constraint then correctly deduplicates.

### Pitfall 5: source_page During SSR

**What goes wrong:** Footer renders on every page server-side. At SSR time there is no `window` or React router context, so `window.location.pathname` would throw.

**How to avoid:** `usePathname()` from `next/navigation` works correctly during both SSR and client hydration for `'use client'` components. The NewsletterForm is a client island so `usePathname()` is safe.

---

## Code Examples

### Confirmed 23505 Handling (from codebase)

```typescript
// Source: /src/app/api/admin/blog/route.ts line 84
if (error.code === '23505') {
  return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 })
}
```

### Confirmed createAdminClient Usage (from codebase)

```typescript
// Source: /src/lib/supabase/admin.ts
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### Confirmed usePathname (from codebase)

```typescript
// Source: /src/app/(admin)/_components/AdminSidebar.tsx
import { usePathname } from 'next/navigation'
const pathname = usePathname()
```

---

## RLS Strategy

**newsletter_subscribers uses RLS, but no public-facing policies are needed.**

- `enable row level security` — prevents any direct anon/authenticated client access by default.
- No SELECT policy — no row is ever returned to the browser.
- No INSERT policy — inserts happen only through the API route via service-role key, which bypasses RLS entirely.
- No UPDATE/DELETE policy — only the Supabase dashboard (service role) can modify data.

This matches the `orders` and `order_items` tables which have RLS enabled but all access is via service role through server-side routes.

---

## Footer Integration Detail

Current Footer.tsx structure:

- Server Component (no `'use client'`)
- `grid-cols-1 md:grid-cols-3` — three columns: Brand, Navigation, Connect
- `bg-cocoa text-cream` colours
- Uses `font-display`, `font-heading`, `font-body` design tokens
- Uses colour tokens: `text-gold`, `text-cream/60`, `text-cream/80`, `text-cream/40`

Required changes:
1. Import `NewsletterForm` from `'./NewsletterForm'`
2. Add fourth column JSX inside the grid div
3. Update grid class to `md:grid-cols-4` (or keep at 3 with the newsletter form wrapping — planner decides)
4. NewsletterForm renders its own inputs styled to match the Footer's dark background (`bg-cocoa`)

Input styling note: Inputs on a dark `bg-cocoa` background need explicit bg/border/text colours. Tailwind's default form styles assume a light background. Use classes like `bg-cocoa border border-cream/20 text-cream placeholder:text-cream/40 focus:border-gold`.

---

## Open Questions

1. **Grid layout on mobile:** Context says the form is "a column alongside existing footer link columns (same visual weight)". On mobile the grid is `grid-cols-1` which stacks all columns. The newsletter column will stack below Connect naturally — this should be acceptable. No open issue, just noting for planner.

2. **Rate limiting:** Context does not require rate limiting in Phase 8. The API route has no per-IP throttle. This is acceptable for an MVP newsletter signup but worth noting for future hardening. No action needed in Phase 8.

3. **Admin view of subscribers:** Context does not include an admin UI for newsletter subscribers in Phase 8. The data will be readable via the Supabase dashboard directly. No admin route or page is needed for this phase.

---

## Sources

### Primary (HIGH confidence)
- `/src/components/layout/Footer.tsx` — exact current Footer structure
- `/src/types/supabase.ts` — established type pattern for all tables
- `/src/lib/supabase/schema.sql` — SQL migration format and RLS pattern
- `/src/lib/supabase/admin.ts` — createAdminClient pattern
- `/src/app/api/admin/faqs/route.ts` — POST API route pattern
- `/src/app/api/admin/blog/route.ts` — 23505 error handling pattern
- `/src/app/layout.tsx` — Footer placement in root layout
- `/src/components/faq/FaqAccordion.tsx` — client island in server page pattern
- `/src/app/(admin)/_components/AdminSidebar.tsx` — usePathname usage

### Secondary (MEDIUM confidence)
- Next.js 15 App Router docs: `usePathname` is safe in `'use client'` components during SSR — consistent with AdminSidebar usage in this codebase

---

## Metadata

**Confidence breakdown:**
- Supabase table + TypeScript types: HIGH — follows exact existing pattern
- RLS strategy: HIGH — mirrors orders/order_items approach documented in project STATE
- API route: HIGH — direct adaptation of /api/admin/faqs/route.ts without auth check
- NewsletterForm client island: HIGH — mirrors FaqAccordion pattern exactly
- Footer integration: HIGH — Footer source read directly; grid change is straightforward
- source_page via usePathname: HIGH — usePathname already used in AdminSidebar

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable patterns, no fast-moving dependencies)
