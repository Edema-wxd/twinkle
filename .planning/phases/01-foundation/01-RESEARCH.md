# Phase 1: Foundation - Research

**Researched:** 2026-03-19
**Domain:** Next.js 15 App Router, Tailwind CSS v4, Supabase SSR, Font Self-Hosting
**Confidence:** HIGH (all major claims verified against official documentation)

---

## Summary

Phase 1 establishes the full project skeleton for Twinkle Locs: a Next.js 15 App Router project with TypeScript, Tailwind CSS v4, self-hosted fonts, shared layout components, Supabase backend wiring, and strict lowercase URL enforcement.

The standard approach in 2026 is Next.js 15 + React 19 + Tailwind CSS v4 (CSS-first, no config file) + `@supabase/ssr` for server-side auth. The Tailwind v4 shift from a JS config file to CSS `@theme` directives is the biggest mindset change. Everything else is evolutionary rather than revolutionary.

The Halimun font requires a commercial license purchase from Creatype Studio before use in this project. Raleway and Inter are available free via Google Fonts (OFL licence) and can be loaded through `next/font/google` with zero browser requests to Google.

**Primary recommendation:** Scaffold with `create-next-app@latest` (which now ships Tailwind v4 by default), wire Supabase SSR immediately using the `@supabase/ssr` package, purchase or source Halimun commercially before building font tokens, and put the lowercase-URL middleware in place on day one so every route created after it is already compliant.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x (latest) | Framework + routing | Project requirement |
| react | 19.x | UI runtime | Required by Next 15 |
| typescript | 5.x | Type safety | Project requirement |
| tailwindcss | 4.x | Utility CSS | Project requirement; v4 ships by default with `create-next-app` in 2025+ |
| @tailwindcss/postcss | 4.x | PostCSS plugin | Required by Tailwind v4 (replaces old `tailwindcss` postcss plugin) |
| @supabase/supabase-js | latest | Supabase JS client | Official client |
| @supabase/ssr | latest | SSR cookie handling | Required for Next.js App Router auth; replaces deprecated `@supabase/auth-helpers` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supabase (CLI) | >=1.8.1 dev dep | Type generation | Run `supabase gen types` against remote project |
| next/font/google | built-in | Raleway + Inter self-hosting | Auto-downloads at build, zero Google requests at runtime |
| next/font/local | built-in | Halimun self-hosting | For the purchased woff2 file |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind v4 | Tailwind v3 | v3 still works but requires `tailwind.config.js`; v4 is the new default and is faster |
| `@supabase/ssr` | `@supabase/auth-helpers` | auth-helpers is deprecated; all future fixes go to `@supabase/ssr` only |
| `next/font/google` for Raleway/Inter | `@fontsource/raleway` npm package | next/font is zero-config self-hosting; fontsource adds bundle overhead |

### Installation

```bash
# Bootstrap (Tailwind v4 is now the default in create-next-app)
npx create-next-app@latest twinkle --typescript --eslint --app --src-dir --import-alias "@/*"

# Supabase packages
npm install @supabase/supabase-js @supabase/ssr

# Supabase CLI as dev dep for type generation
npm install supabase --save-dev
```

---

## Architecture Patterns

### Recommended Project Structure

```
twinkle/
├── public/
│   └── fonts/              # Self-hosted woff2 files (Halimun)
├── src/
│   ├── app/
│   │   ├── (marketing)/    # Route group — home, about, contact (shared marketing layout)
│   │   ├── (shop)/         # Route group — products, cart, checkout
│   │   ├── (admin)/        # Route group — admin panel (protected)
│   │   ├── api/            # Route handlers
│   │   ├── globals.css     # @import "tailwindcss"; @theme { … }
│   │   ├── layout.tsx      # Root layout: html, body, fonts, WhatsApp button
│   │   └── not-found.tsx   # 404 page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── MobileDrawer.tsx
│   │   ├── ui/             # Reusable primitives (Button, Badge, etc.)
│   │   └── WhatsAppButton.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts   # createBrowserClient
│   │   │   └── server.ts   # createServerClient
│   │   └── fonts.ts        # All next/font instances defined once, exported
│   └── types/
│       └── supabase.ts     # Generated — do not edit manually
├── middleware.ts            # Lowercase URL redirect + Supabase session refresh
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

**Key decisions:**
- Use `src/` directory. Keeps app code separate from config files at root.
- `(marketing)`, `(shop)`, `(admin)` route groups from day one. URL structure is clean; layouts differ per group.
- `src/lib/fonts.ts` defines all font instances in one place. Import the objects wherever needed rather than calling `localFont` / Google font functions multiple times.
- `src/types/supabase.ts` is the generated types file. Put it in `types/` and never edit it by hand.

### Pattern 1: Tailwind v4 Design Token Definition

**What:** All design tokens (colours, fonts) live in `globals.css` under `@theme`. No `tailwind.config.js` file.
**When to use:** Always in v4.

```css
/* src/app/globals.css */
/* Source: https://tailwindcss.com/docs/theme */

@import "tailwindcss";

@theme {
  /* Afro-luxury colour palette */
  --color-gold:        #C9A84C;   /* Deep gold */
  --color-cocoa:       #3B1F0E;   /* Rich cocoa brown */
  --color-cream:       #FAF3E0;   /* Warm cream */
  --color-forest:      #2D5016;   /* Forest green */
  --color-terracotta:  #C1440E;   /* Terracotta */

  /* Neutral shades */
  --color-charcoal:    #1A1A1A;
  --color-stone:       #F5F0E8;

  /* Font families — next/font injects the actual family string via CSS variable */
  --font-display: var(--font-halimun), serif;   /* decorative headings */
  --font-heading: var(--font-raleway), sans-serif;
  --font-body:    var(--font-inter), sans-serif;
}
```

This automatically generates utility classes: `bg-gold`, `text-cocoa`, `font-display`, etc.

### Pattern 2: Connecting next/font CSS Variables to Tailwind Tokens

**What:** `next/font` generates a CSS variable on `<html>`. Tailwind `@theme` references that variable.

```typescript
// src/lib/fonts.ts
// Source: https://nextjs.org/docs/app/getting-started/fonts
import localFont from 'next/font/local'
import { Raleway, Inter } from 'next/font/google'

export const halimun = localFont({
  src: [
    { path: '../../../public/fonts/Halimun.woff2', weight: '400', style: 'normal' },
  ],
  variable: '--font-halimun',
  display: 'swap',
})

export const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
```

```typescript
// src/app/layout.tsx
import { halimun, raleway, inter } from '@/lib/fonts'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${halimun.variable} ${raleway.variable} ${inter.variable}`}
    >
      <body className="font-body bg-cream text-charcoal">
        {children}
      </body>
    </html>
  )
}
```

### Pattern 3: Supabase SSR Client Pair

**What:** Two client factory functions — one for Server Components/Actions, one for Client Components.

```typescript
// src/lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()   // async in Next.js 15

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
            // Server Component — cookie writes handled by middleware
          }
        },
      },
    }
  )
}
```

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### Pattern 4: Middleware — Supabase Token Refresh + Lowercase URLs

**What:** Single middleware handles both session refresh and URL normalisation.

```typescript
// middleware.ts (project root)
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 1. Lowercase URL redirect
  const { pathname, search, origin } = request.nextUrl
  if (pathname !== pathname.toLowerCase()) {
    return NextResponse.redirect(new URL(origin + pathname.toLowerCase() + search))
  }

  // 2. Supabase session refresh
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must be called before any auth check
  await supabase.auth.getClaims()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 5: Mobile Navigation Drawer (Pure React + Tailwind)

**What:** State-driven slide-in drawer without any external library. Uses `translate-x` + `transition` for animation.

```typescript
// src/components/layout/MobileDrawer.tsx
'use client'
import { useEffect } from 'react'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function MobileDrawer({ isOpen, onClose, children }: MobileDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-cocoa/60 transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      {/* Drawer panel */}
      <nav
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-cream flex flex-col p-6
          shadow-xl transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {children}
      </nav>
    </>
  )
}
```

### Pattern 6: WhatsApp Floating Button

**What:** Fixed-position button on every page using the `wa.me` URL format.

```typescript
// src/components/WhatsAppButton.tsx
export function WhatsAppButton({ phoneNumber }: { phoneNumber: string }) {
  // phoneNumber format: international without + or spaces e.g. "2348012345678"
  return (
    <a
      href={`https://wa.me/${phoneNumber}?text=Hi%2C%20I%27m%20interested%20in%20your%20loc%20beads`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center
                 justify-center rounded-full bg-[#25D366] shadow-lg
                 transition-transform hover:scale-110 active:scale-95"
    >
      {/* WhatsApp SVG icon */}
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15
          -.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463
          -2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606
          .134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371
          -.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51
          -.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04
          1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096
          3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195
          1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289
          .173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057
          23.882l6.198-1.448A11.934 11.934 0 0012 24c6.627 0 12-5.373
          12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.031-1.384l-.361
          -.214-3.681.861.882-3.574-.235-.373A9.8 9.8 0 012.182 12
          c0-5.42 4.399-9.818 9.818-9.818 5.42 0 9.818 4.399
          9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/>
      </svg>
    </a>
  )
}
```

Render in `src/app/layout.tsx` (root layout) to appear on every page.

**wa.me URL format:**
- Basic: `https://wa.me/{countrycode}{number}` — no `+`, no spaces, no dashes
- With pre-filled text: append `?text=URL-encoded-message`
- Nigeria country code: 234

### Anti-Patterns to Avoid

- **Calling `localFont` or Google font functions multiple times for the same font.** Each call creates a separate hosted instance. Define once in `src/lib/fonts.ts`, import the object.
- **Accessing `cookies()` synchronously in Next.js 15.** `cookies()`, `headers()`, `draftMode()` are now async — must be `await`-ed.
- **Accessing `params` synchronously in pages/layouts.** `params` is now `Promise<{…}>` — must be `await`-ed or unwrapped with `use()`.
- **Using `@supabase/auth-helpers`.** This package is deprecated. Use `@supabase/ssr` only.
- **Using `supabase.auth.getSession()` in server code for auth checks.** Use `supabase.auth.getClaims()` instead; it validates the JWT signature server-side.
- **Putting uppercase letters in folder names inside `src/app/`.** File-system folder names become URL segments. Keep them lowercase.
- **Skipping the `variable` prop on next/font instances.** Without `variable: '--font-xxx'`, the font cannot be referenced from Tailwind's `@theme` CSS variables.
- **Creating `tailwind.config.js` in a v4 project.** v4 is CSS-first; the JS config file is not generated and not needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font self-hosting + layout shift | Manual `@font-face` in CSS | `next/font/local` + `next/font/google` | Handles subsetting, preloading, `font-display`, CORS |
| Cookie-based session refresh for SSR | Custom cookie middleware | `@supabase/ssr` `createServerClient` | Handles refresh token rotation, secure cookie config |
| TypeScript types for Supabase | Hand-written types | `supabase gen types typescript` | Generated from live schema; always in sync |
| Lowercase URL normalisation | Custom routing logic | Middleware redirect (Pattern 4 above) | One place, runs before all routes, handles all edge cases |
| Auth token validation on server | Manual JWT decode | `supabase.auth.getClaims()` | Validates JWT signature; `getSession()` does not |

**Key insight:** Next.js and Supabase have solved most infrastructure concerns properly. The risk is building a weaker version of what already exists.

---

## Common Pitfalls

### Pitfall 1: Async Request APIs (Next.js 15 Breaking Change)

**What goes wrong:** Code that worked in Next.js 14 using `cookies()`, `headers()`, or `params` synchronously throws a runtime error or logs deprecation warnings in v15.
**Why it happens:** These APIs were made async in v15 to support streaming.
**How to avoid:** Always `await cookies()`, `await headers()`, and `await params` in async Server Components. In synchronous components, use React's `use()` hook.
**Warning signs:** Dev console warnings containing "UnsafeUnwrapped" or TypeScript errors saying `params` is a `Promise`.

### Pitfall 2: Halimun Font — Commercial Licence Required

**What goes wrong:** Using the "free" download from font repository sites in a commercial e-commerce project violates the licence terms.
**Why it happens:** Halimun by Creatype Studio is free for personal use only. Every font repository listing it says "not for commercial use."
**How to avoid:** Purchase the commercial licence from [creatypestudio.co/halimun](https://creatypestudio.co/halimun) before integrating the font. If budget is a constraint before purchase, use a placeholder font during development (e.g. Playfair Display from Google Fonts, similar feel).
**Warning signs:** Font zip includes a `Readme.txt` stating personal-use-only.

### Pitfall 3: Tailwind v4 Has No `tailwind.config.js` by Default

**What goes wrong:** Tutorials and Stack Overflow answers from 2024 and earlier instruct you to create a config file. v4 ignores or conflicts with an inadvertently created config.
**Why it happens:** v4 is CSS-first. All configuration moved into `globals.css` under `@theme`.
**How to avoid:** Do not create `tailwind.config.js`. Define all tokens in `@theme` in `globals.css`.
**Warning signs:** Tailwind classes not generating, especially custom colour/font classes.

### Pitfall 4: Supabase `createServerClient` Cookie Writes Fail in Server Components

**What goes wrong:** Session updates (token refresh) are silently lost in Server Components that don't use middleware.
**Why it happens:** Server Components cannot write cookies directly. They can only read them.
**How to avoid:** The `try/catch` around `setAll` in the server client is intentional — it suppresses the "cannot set cookies in Server Component" error. Token refresh is handled by the middleware, which runs first and has full read/write cookie access.
**Warning signs:** Users get logged out unexpectedly; session appears valid in middleware but expired in page components.

### Pitfall 5: Middleware Runs on Static Assets Without a Proper Matcher

**What goes wrong:** Middleware runs on every `/_next/static/` and `/_next/image/` request, causing performance degradation and potential auth loops.
**Why it happens:** Without a `config.matcher`, Next.js runs middleware on every request.
**How to avoid:** Use the matcher pattern in Pattern 4 above which excludes static file extensions and `_next/*` paths.
**Warning signs:** Dev tools show many middleware executions for CSS/JS/image requests.

### Pitfall 6: Multiple Root Layouts Breaking WhatsApp Button Visibility

**What goes wrong:** If route groups each have their own root layout (e.g. `(admin)` has a separate layout), the WhatsApp button in the root layout won't appear inside those groups.
**Why it happens:** Multiple root layouts do not inherit from `app/layout.tsx`.
**How to avoid:** Keep a single root layout in `app/layout.tsx` that includes the WhatsApp button. Route groups can have their own nested layouts for structure without creating separate roots.
**Warning signs:** WhatsApp button missing on some pages.

---

## Code Examples

### PostCSS Configuration (Tailwind v4)

```javascript
// postcss.config.mjs
// Source: https://tailwindcss.com/docs/guides/nextjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
export default config
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Note: Supabase now uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` instead of the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Both work, but publishable key is the current standard name in Supabase docs.

### TypeScript Type Generation

```bash
# Run after Supabase schema is set up
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_REF" \
  --schema public \
  > src/types/supabase.ts
```

### Using Generated Types

```typescript
// Source: https://supabase.com/docs/reference/javascript/typescript-support
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { Tables } from '@/types/supabase'

// Typed client
const supabase = createClient<Database>(url, key)

// Helper type for rows
type Product = Tables<'products'>
```

### Supabase Storage Bucket Conventions for E-commerce

Recommended buckets to create in Supabase Dashboard:
- `product-images` — public bucket, PNG/JPEG/WEBP, max 5MB per file
- `site-assets` — public bucket, logos, banners

Storage access pattern for product images:
```typescript
const { data } = supabase.storage
  .from('product-images')
  .getPublicUrl('beads/gold-spiral-bead.jpg')

// Resize on the fly (Supabase Image Transformations feature)
const { data: resized } = supabase.storage
  .from('product-images')
  .getPublicUrl('beads/gold-spiral-bead.jpg', {
    transform: { width: 400, height: 400, quality: 80 }
  })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` | `@theme` in CSS | Tailwind v4 (Jan 2025) | No JS config file needed |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Tailwind v4 | Single import line |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Mid-2024 | auth-helpers deprecated |
| `cookies()` synchronous | `await cookies()` | Next.js 15 | Breaking change |
| `params.slug` direct | `const { slug } = await params` | Next.js 15 | Breaking change |
| `@next/font` package | `next/font` built-in | Next.js 13 | `@next/font` removed in v15 |
| `supabase.auth.getSession()` for server auth | `supabase.auth.getClaims()` | Supabase 2024 | Security: getClaims validates JWT |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: replaced by `@supabase/ssr`
- `@next/font`: removed in Next.js 15, use `next/font`
- `export const runtime = "experimental-edge"`: use `"edge"`
- `tailwind.config.js` with v4: not needed

---

## Open Questions

1. **Halimun font procurement**
   - What we know: Free version is personal-use only. Commercial licence exists at creatypestudio.co/halimun.
   - What's unclear: Exact commercial licence cost and delivery format (woff2 included or ttf only?).
   - Recommendation: Purchase before Phase 1 dev starts. If blocked, use Playfair Display (Google Fonts, OFL, variable font) as a placeholder — similar old-world serif feel.

2. **Supabase project tier for Phase 1**
   - What we know: Free tier supports 500MB database, 1GB storage.
   - What's unclear: Whether project will stay on free tier long-term (affects storage limits for product images).
   - Recommendation: Use free tier for Phase 1. Upgrade when product catalogue exceeds free limits.

3. **Tailwind v4 browser compatibility for target audience**
   - What we know: Tailwind v4 requires browsers ≥ 3 years old (Chrome 111+, Safari 16.4+, Firefox 128+). v4.1 adds better fallbacks.
   - What's unclear: Exact browser distribution of Nigerian mobile users — some may use older Chrome on lower-end Android.
   - Recommendation: Proceed with v4; the subset of users on truly ancient browsers is very small. Monitor in analytics post-launch.

---

## Sources

### Primary (HIGH confidence)

- [Next.js upgrade guide v14→v15](https://nextjs.org/docs/app/guides/upgrading/version-15) — async APIs, fetch caching, React 19 minimum
- [Next.js project structure docs](https://nextjs.org/docs/app/getting-started/project-structure) — folder conventions, route groups, src/ directory
- [Next.js font optimisation docs](https://nextjs.org/docs/app/getting-started/fonts) — `next/font/local`, `next/font/google`, variable CSS integration
- [Tailwind CSS v4 guide for Next.js](https://tailwindcss.com/docs/guides/nextjs) — installation steps, PostCSS config
- [Tailwind CSS v4 @theme directive](https://tailwindcss.com/docs/theme) — design token definition, `--color-*`, `--font-*` namespaces
- [Supabase SSR Next.js guide](https://supabase.com/docs/guides/auth/server-side/nextjs) — `@supabase/ssr` setup, middleware pattern
- [Supabase creating a client (SSR)](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — exact server and browser client code
- [Supabase TypeScript type generation](https://supabase.com/docs/guides/api/rest/generating-types) — CLI command, `supabase gen types typescript`
- [Supabase JavaScript TypeScript support](https://supabase.com/docs/reference/javascript/typescript-support) — typed client pattern, `Tables<>` helper

### Secondary (MEDIUM confidence)

- [nesin.io — Redirect URLs to lowercase with Next.js middleware](https://nesin.io/blog/redirect-urls-to-lowercase-nextjs-middleware) — verified pattern with official `NextResponse` API
- [1001Fonts — Halimun font](https://www.1001fonts.com/halimun-font.html) — confirmed personal-use-only licence

### Tertiary (LOW confidence)

- [Creatype Studio — Halimun commercial licence](https://creatypestudio.co/halimun) — commercial licence exists; price/format not confirmed without purchase flow

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from official docs
- Architecture: HIGH — Next.js official project structure docs
- Font strategy: HIGH (Raleway/Inter) / MEDIUM (Halimun — licence confirmed, file format unconfirmed until purchase)
- Supabase SSR patterns: HIGH — from official Supabase docs, code verified
- Tailwind v4 tokens: HIGH — from official Tailwind docs
- Pitfalls: HIGH — sourced from official Next.js upgrade guide and Supabase auth docs

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable stack; Supabase and Next.js both release regularly so re-check if more than 30 days pass)
