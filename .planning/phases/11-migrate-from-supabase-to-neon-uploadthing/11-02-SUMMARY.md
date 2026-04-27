# Phase 11 Plan 02: Replace supabase.auth Call Sites — Summary

## One-liner

Replaced all 32 `supabase.auth.getUser()` call sites with `requireAdminSession()` (server components/pages) and `getAdminSession()` (API routes), and rewired login/logout actions to better-auth `signInEmail`/`signOut`.

## Files Migrated

### Group 1 — Login/logout actions (1 file)
- `src/app/(admin)/admin/login/actions.ts` — Pattern C full replacement; uses `auth.api.signInEmail` + `auth.api.signOut` with `headers()` forwarding and `APIError` catch

### Group 2 — Protected layout + dashboard + products pages (5 files)
- `src/app/(admin)/admin/(protected)/layout.tsx`
- `src/app/(admin)/admin/(protected)/page.tsx`
- `src/app/(admin)/admin/(protected)/products/page.tsx`
- `src/app/(admin)/admin/(protected)/products/new/page.tsx`
- `src/app/(admin)/admin/(protected)/products/[id]/page.tsx`

### Group 3 — Orders + reviews + faqs pages (5 files)
- `src/app/(admin)/admin/(protected)/orders/page.tsx`
- `src/app/(admin)/admin/(protected)/orders/[id]/page.tsx`
- `src/app/(admin)/admin/(protected)/reviews/page.tsx`
- `src/app/(admin)/admin/(protected)/faqs/page.tsx`
- `src/app/(admin)/admin/(protected)/faqs/[id]/page.tsx`

### Group 4 — Blog + pages + shipping + settings pages (6 files)
- `src/app/(admin)/admin/(protected)/pages/page.tsx`
- `src/app/(admin)/admin/(protected)/blog/page.tsx`
- `src/app/(admin)/admin/(protected)/blog/new/page.tsx`
- `src/app/(admin)/admin/(protected)/blog/[id]/page.tsx`
- `src/app/(admin)/admin/(protected)/shipping/page.tsx`
- `src/app/(admin)/admin/(protected)/settings/page.tsx`

### Group 5 — Abandoned orders page + products/orders API routes (5 files)
- `src/app/(admin)/admin/(protected)/abandoned-orders/[id]/page.tsx`
- `src/app/api/admin/products/route.ts`
- `src/app/api/admin/products/[id]/route.ts`
- `src/app/api/admin/products/[id]/toggle-active/route.ts`
- `src/app/api/admin/orders/[id]/route.ts`

### Group 6 — Reviews + faqs + pages API routes (5 files)
- `src/app/api/admin/reviews/route.ts`
- `src/app/api/admin/reviews/[id]/route.ts` — also removed local `getAuthenticatedUser` supabase wrapper
- `src/app/api/admin/faqs/route.ts`
- `src/app/api/admin/faqs/[id]/route.ts`
- `src/app/api/admin/pages/route.ts`

### Group 7 — Blog + shipping + settings API routes (4 files)
- `src/app/api/admin/blog/route.ts`
- `src/app/api/admin/blog/[id]/route.ts`
- `src/app/api/admin/shipping/route.ts`
- `src/app/api/admin/settings/route.ts`

**Total: 31 files migrated** (login/page.tsx was `'use client'` with no supabase import — no change needed)

## Login/Logout Action Pattern

```typescript
// actions.ts — Pattern C
import { auth } from '@/lib/auth'
import { APIError } from 'better-auth/api'

export async function loginAction(formData: FormData) {
  // ...
  await auth.api.signInEmail({ body: { email, password }, headers: await headers() })
  redirect('/admin')
}

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() })
  redirect('/admin/login')
}
```

## Auth Call Counts

| Metric | Before | After |
|--------|--------|-------|
| `supabase.auth.` references in src/ | 32 | 0 |
| Files importing `@/lib/auth/server` | 0 | 30 |
| `npx tsc --noEmit` errors | 0 | 0 |

## Migration Patterns Applied

- **Server components / pages**: `await requireAdminSession()` — redirects to `/admin/login` if no session
- **API route handlers**: `const session = await getAdminSession(); if (!session) return 401` — JSON error response
- Removed `import { createClient } from '@/lib/supabase/server'` from all migrated files
- Removed `import { redirect } from 'next/navigation'` where it was only used for auth redirect (kept where used for `notFound` companion or other redirects — but all such cases resolved to `notFound` only)

## Commits

| Hash | Description |
|------|-------------|
| eb56df5 | feat(11-02): replace supabase login/logout with better-auth signInEmail/signOut |
| da583f0 | feat(11-02): migrate protected layout + dashboard + products pages to requireAdminSession |
| e4b9823 | feat(11-02): migrate orders + reviews + faqs pages to requireAdminSession |
| 2ea5b37 | feat(11-02): migrate blog + pages + shipping + settings pages to requireAdminSession |
| 5a2f555 | feat(11-02): migrate abandoned-orders page + products/orders API routes to getAdminSession |
| 0f6f6b5 | feat(11-02): migrate reviews + faqs + pages API routes to getAdminSession |
| d3552b5 | feat(11-02): migrate blog + shipping + settings API routes to getAdminSession |

## Note: @/lib/supabase/* files still exist

`src/lib/supabase/` (server.ts, client.ts, middleware.ts) have NOT been deleted. They are preserved intentionally — Plan 03 handles their removal along with uninstalling the `@supabase/*` packages and cleaning up any remaining references.

## Known Stubs

None — all auth call sites have been wired to real better-auth session checks.
