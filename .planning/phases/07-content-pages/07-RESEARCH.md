# Phase 7: Content Pages - Research

**Researched:** 2026-03-26
**Domain:** Next.js 15 App Router content pages, Supabase schema design, Tiptap HTML rendering, accordion UX, intersection observer
**Confidence:** HIGH — findings derived from reading the actual codebase, not training-data assumptions

---

## Summary

Phase 7 adds four public content pages (/about, /faq, /shipping, /blog + /blog/[slug]) and four matching admin management routes (/admin/pages, /admin/faqs, /admin/shipping, /admin/blog). Every pattern needed is already established in the project — Server Component page fetches, `use client` form components, POST/PUT to /api/admin/*, createAdminClient() service-role writes, toast pattern, Tiptap RichTextEditor component, ImageUploader with Supabase Storage, slug generation from ProductForm.

The work is entirely additive: new database tables, new route files, new components. No existing files need modification except two: `src/types/supabase.ts` (extend with four new tables) and `src/app/(admin)/_components/AdminSidebar.tsx` (add four nav links).

**Primary recommendation:** Treat the Settings page + ProductForm as the two templates. All new admin pages follow one of those two shapes. The public pages are Server Components — static data fetched server-side, interactive elements (accordion, sticky nav, category filter) isolated in small `use client` leaf components.

---

## Standard Stack

No new dependencies are required. Everything needed is already installed.

### Core (already installed)
| Library | Version | Purpose |
|---------|---------|---------|
| `@tiptap/react` | ^2.27.2 | Rich-text editor — admin side |
| `@tiptap/starter-kit` | ^2.27.2 | Editor extensions (bold, italic, headings, lists, links) |
| `@supabase/supabase-js` | latest | DB + Storage client |
| `@supabase/ssr` | latest | Server-side auth-aware client |
| `next` | ^15 | App Router, Server Components, async params |
| `tailwindcss` | ^4 | Styling — `@import "tailwindcss"` + `@theme` |

### No new installs needed
All interactive patterns (accordion, intersection observer, share buttons) are implemented with React state + browser APIs — no extra libraries required. The project already avoids unnecessary dependencies.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
├── app/
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── pages/
│   │   │   │   └── page.tsx               # /admin/pages — about page sections editor
│   │   │   ├── faqs/
│   │   │   │   ├── page.tsx               # /admin/faqs — FAQ list + new FAQ form
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx           # /admin/faqs/[id] — edit single FAQ
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx               # /admin/blog — post list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx           # /admin/blog/new
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx           # /admin/blog/[id] — edit post
│   │   │   └── shipping/
│   │   │       └── page.tsx               # /admin/shipping — shipping content editor
│   │   └── _components/
│   │       ├── AboutPagesForm.tsx          # use client
│   │       ├── FaqForm.tsx                 # use client
│   │       ├── BlogPostForm.tsx            # use client
│   │       └── ShippingForm.tsx            # use client
│   ├── api/
│   │   └── admin/
│   │       ├── pages/
│   │       │   └── route.ts               # PUT — upsert about_sections rows
│   │       ├── faqs/
│   │       │   ├── route.ts               # GET (admin), POST
│   │       │   └── [id]/
│   │       │       └── route.ts           # PUT, DELETE
│   │       ├── blog/
│   │       │   ├── route.ts               # POST
│   │       │   └── [id]/
│   │       │       └── route.ts           # PUT, DELETE
│   │       └── shipping/
│   │           └── route.ts               # PUT — upsert settings rows
│   ├── about/
│   │   └── page.tsx                       # Server Component
│   ├── faq/
│   │   └── page.tsx                       # Server Component
│   ├── shipping/
│   │   └── page.tsx                       # Server Component
│   └── blog/
│       ├── page.tsx                       # Server Component — listing
│       └── [slug]/
│           └── page.tsx                   # Server Component — individual post
└── components/
    ├── about/
    │   ├── AboutStickyNav.tsx             # use client (intersection observer)
    │   └── AboutSection.tsx               # Server Component (HTML renderer)
    ├── faq/
    │   └── FaqAccordion.tsx               # use client (open/close state)
    └── blog/
        ├── BlogCategoryFilter.tsx         # use client (active tab state)
        ├── BlogShareButtons.tsx           # use client (window.location.href)
        └── BlogRelatedPosts.tsx           # Server Component
```

### Pattern 1: Admin page (matches existing Settings + Products pattern)

Server Component page fetches → passes data → `use client` form → POST/PUT to /api/admin/*

```typescript
// src/app/(admin)/admin/faqs/page.tsx — Server Component
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FaqList } from '../../_components/FaqList'

export default async function AdminFaqsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const adminClient = createAdminClient()
  const { data: faqs } = await adminClient
    .from('faqs')
    .select('*')
    .order('category')
    .order('display_order')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="font-heading text-2xl font-bold text-white">FAQs</h1>
      <FaqList faqs={faqs ?? []} />
    </div>
  )
}
```

### Pattern 2: Public page with Tiptap HTML rendering

Tiptap stores HTML strings. On public pages, render with `dangerouslySetInnerHTML` inside a container with Tailwind `prose`-style classes applied manually (project uses Tailwind v4, no @tailwindcss/typography plugin). Apply utility classes to the wrapper:

```typescript
// src/components/about/AboutSection.tsx — Server Component, no 'use client'
interface AboutSectionProps {
  html: string
}

export function AboutSection({ html }: AboutSectionProps) {
  return (
    <div
      className="[&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-4 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_a]:text-gold [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

**Critical:** The project does NOT have @tailwindcss/typography installed — `prose` classes will not work. Use `[&_tag]:` utility selectors on the wrapper div instead.

### Pattern 3: Accordion (one-open-at-a-time, no library)

```typescript
// src/components/faq/FaqAccordion.tsx
'use client'
import { useState } from 'react'

interface FaqItem { id: string; question: string; answer: string; category: string }

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  // Group by category
  const grouped = faqs.reduce<Record<string, FaqItem[]>>((acc, faq) => {
    acc[faq.category] ??= []
    acc[faq.category].push(faq)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category}>
          <h2 className="font-heading text-lg font-semibold mb-3">{category}</h2>
          <div className="divide-y divide-stone-200">
            {items.map((faq) => (
              <div key={faq.id}>
                <button
                  className="w-full flex items-center justify-between py-4 text-left"
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  aria-expanded={openId === faq.id}
                >
                  <span className="font-medium">{faq.question}</span>
                  <span className="ml-4 shrink-0 text-gold">
                    {openId === faq.id ? '−' : '+'}
                  </span>
                </button>
                {openId === faq.id && (
                  <p className="pb-4 text-charcoal/70 leading-relaxed">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

CSS transition animation: use `max-height` transition or simple conditional render. For the brand aesthetic, a simple `grid-rows-[0fr]/[1fr]` transition in Tailwind v4 works cleanly.

### Pattern 4: Sticky pill nav with intersection observer

```typescript
// src/components/about/AboutStickyNav.tsx
'use client'
import { useState, useEffect } from 'react'

const SECTIONS = [
  { id: 'founder-story', label: 'Founder Story' },
  { id: 'brand-mission', label: 'Brand Mission' },
  { id: 'why-loc-beads', label: 'Why Loc Beads' },
  { id: 'contact', label: 'Contact' },
]

export function AboutStickyNav() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id)

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(id) },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      )
      observer.observe(el)
      observers.push(observer)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  return (
    <nav className="sticky top-4 z-30 flex justify-center">
      <div className="flex gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-2 shadow-md border border-stone-200">
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className={`px-4 py-1.5 rounded-full text-sm font-heading font-medium transition-colors ${
              activeId === id
                ? 'bg-gold text-white'
                : 'text-charcoal/60 hover:text-charcoal'
            }`}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}
```

**rootMargin trick:** `-30% 0px -60% 0px` means only the middle 10% of the viewport triggers the active state, preventing rapid flickering at section boundaries.

### Pattern 5: Blog category filter tabs

Server-side filtering via URL search params — no client-side state required for the filter itself. Client component only manages the "active tab" appearance.

```typescript
// src/app/blog/page.tsx — Server Component
interface BlogPageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { category } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, tag, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })

  if (category) {
    query = query.eq('tag', category)
  }

  const { data: posts } = await query

  // Get distinct tags for filter tabs
  const { data: allPosts } = await supabase
    .from('blog_posts')
    .select('tag')
    .eq('published', true)
  const tags = [...new Set((allPosts ?? []).map((p) => p.tag).filter(Boolean))]

  return (
    <>
      <BlogCategoryFilter tags={tags} activeTag={category ?? null} />
      {/* render post cards */}
    </>
  )
}
```

```typescript
// src/components/blog/BlogCategoryFilter.tsx — use client
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export function BlogCategoryFilter({ tags, activeTag }: { tags: string[]; activeTag: string | null }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function selectTag(tag: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (tag) params.set('category', tag)
    else params.delete('category')
    router.push(`/blog?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => selectTag(null)} className={activeTag === null ? 'bg-gold text-white ...' : '...'}>
        All
      </button>
      {tags.map((tag) => (
        <button key={tag} onClick={() => selectTag(tag)} className={activeTag === tag ? 'bg-gold text-white ...' : '...'}>
          {tag}
        </button>
      ))}
    </div>
  )
}
```

### Pattern 6: Share buttons

```typescript
// src/components/blog/BlogShareButtons.tsx — use client
'use client'

interface BlogShareButtonsProps {
  title: string
  slug: string
}

export function BlogShareButtons({ title, slug }: BlogShareButtonsProps) {
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/blog/${slug}`
    : `https://twinklelocs.com/blog/${slug}`

  const waText = encodeURIComponent(`${title} ${url}`)
  const waUrl = `https://wa.me/?text=${waText}`

  const twitterText = encodeURIComponent(title)
  const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}&url=${encodeURIComponent(url)}`

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-charcoal/60">Share:</span>
      <a href={waUrl} target="_blank" rel="noopener noreferrer" className="...">WhatsApp</a>
      <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="...">X / Twitter</a>
    </div>
  )
}
```

**WhatsApp share URL format:** `https://wa.me/?text={encoded_text}` — no phone number. This opens the contact picker rather than a specific contact, which is correct for share buttons (distinct from the site's existing WhatsApp CTA, which dials Unoma's number).

**Twitter/X intent URL format:** `https://twitter.com/intent/tweet?text=...&url=...`

### Pattern 7: Related posts query

```typescript
// In /blog/[slug]/page.tsx — Server Component
const { data: relatedPosts } = await supabase
  .from('blog_posts')
  .select('id, title, slug, excerpt, featured_image, published_at')
  .eq('published', true)
  .eq('tag', post.tag)
  .neq('id', post.id)
  .order('published_at', { ascending: false })
  .limit(3)
```

If `post.tag` is null/empty, skip the related posts query entirely (or fall back to `.neq('id', post.id).limit(3)`).

### Anti-Patterns to Avoid

- **Do not use @tailwindcss/typography `prose` classes** — the plugin is not installed. Use `[&_tag]:` selectors on the HTML wrapper instead.
- **Do not fetch blog posts client-side for category filtering** — server-side via URL search params avoids the flash of loading state and keeps content indexable.
- **Do not put the `use client` boundary too high** — sticky nav, accordion, and share buttons are leaf components. Page and section wrapper stay as Server Components.
- **Do not create a separate categories table** — freeform `tag` column on blog_posts is the decision. A join table adds complexity with no benefit at this scale.
- **Do not use `window.location.href` in render** — it crashes SSR. Use `typeof window !== 'undefined'` guard or build the URL from `process.env.NEXT_PUBLIC_SITE_URL` (or construct server-side and pass as a prop to the `use client` share buttons).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich-text rendering CSS | Custom stylesheet | `[&_tag]:` Tailwind utilities on wrapper | @tailwindcss/typography not installed |
| Image upload to Supabase | New uploader | Reuse/copy `ImageUploader.tsx` | Full implementation already exists |
| Slug generation | New utility | Copy `generateSlug()` from ProductForm | Identical need, already tested |
| Auth check boilerplate | New pattern | Copy exact pattern from any admin page.tsx | 3-line pattern, already battle-tested |
| Admin API auth check | New pattern | Copy from `/api/admin/settings/route.ts` | createClient() + getUser() guard |

**Key insight:** The codebase already contains every building block. This phase is composition, not invention.

---

## Supabase Schema

### New tables required

#### `about_sections`
Stores the four sections of the about page. Each row is one section.

```sql
create table about_sections (
  id          text primary key,          -- 'founder-story' | 'brand-mission' | 'why-loc-beads' | 'contact'
  title       text not null,
  body        text not null default '',  -- Tiptap HTML
  image_url   text,                      -- nullable — section may not have image
  display_order int not null default 0,
  updated_at  timestamptz default now()
);

-- RLS: public read, service role write
alter table about_sections enable row level security;
create policy "Public can read about sections"
  on about_sections for select using (true);
```

**Alternative approach (simpler):** Treat about page content the same as settings — one row per section stored in the existing `settings` table under keys like `about_founder_body`, `about_founder_image_url`. This avoids a new table but makes image_url storage awkward. Recommended: use a dedicated table since each section has typed columns (id, title, body, image_url, display_order).

#### `faqs`
```sql
create table faqs (
  id           uuid primary key default gen_random_uuid(),
  category     text not null,            -- 'Shipping' | 'Products' | 'Care' etc.
  question     text not null,
  answer       text not null,            -- plain text, no rich-text
  display_order int not null default 0,
  created_at   timestamptz default now()
);

alter table faqs enable row level security;
create policy "Public can read faqs"
  on faqs for select using (true);
```

#### `blog_posts`
```sql
create table blog_posts (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  body           text not null default '', -- Tiptap HTML
  excerpt        text not null default '',
  featured_image text,                     -- nullable
  tag            text,                     -- freeform, no separate table
  published      boolean not null default false,
  published_at   timestamptz,              -- set when published=true, null for drafts
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table blog_posts enable row level security;
create policy "Public can read published blog posts"
  on blog_posts for select using (published = true);
```

#### Shipping settings — NO new table
Shipping display content (copy, timeframes, international CTA message) already fits in the existing `settings` table under specific keys. The table already uses key/value pairs with the upsert pattern. Add keys:
- `shipping_lagos_rate` (e.g. "3000")
- `shipping_other_rate` (e.g. "4500")
- `shipping_lagos_days` (e.g. "1–2 business days")
- `shipping_other_days` (e.g. "3–5 business days")
- `shipping_intl_message` (pre-filled WhatsApp message text)
- `shipping_page_intro` (optional intro copy)

**This avoids a new table** and fits the existing SettingsForm/PUT /api/admin/settings pattern perfectly. The shipping admin page will be a trimmed version of SettingsForm scoped to shipping keys.

### TypeScript type extensions (src/types/supabase.ts)

Add to the `Tables` object inside `Database['public']['Tables']`:

```typescript
about_sections: {
  Row: {
    id: string
    title: string
    body: string
    image_url: string | null
    display_order: number
    updated_at: string
  }
  Insert: Omit<Database['public']['Tables']['about_sections']['Row'], 'updated_at'> & {
    updated_at?: string
  }
  Update: Partial<Database['public']['Tables']['about_sections']['Insert']>
  Relationships: []
}
faqs: {
  Row: {
    id: string
    category: string
    question: string
    answer: string
    display_order: number
    created_at: string
  }
  Insert: Omit<Database['public']['Tables']['faqs']['Row'], 'id' | 'created_at'> & {
    id?: string
    created_at?: string
  }
  Update: Partial<Database['public']['Tables']['faqs']['Insert']>
  Relationships: []
}
blog_posts: {
  Row: {
    id: string
    title: string
    slug: string
    body: string
    excerpt: string
    featured_image: string | null
    tag: string | null
    published: boolean
    published_at: string | null
    created_at: string
    updated_at: string
  }
  Insert: Omit<Database['public']['Tables']['blog_posts']['Row'], 'id' | 'created_at' | 'updated_at'> & {
    id?: string
    created_at?: string
    updated_at?: string
  }
  Update: Partial<Database['public']['Tables']['blog_posts']['Insert']>
  Relationships: []
}
```

---

## Common Pitfalls

### Pitfall 1: `prose` class doesn't exist
**What goes wrong:** Developer writes `className="prose"` on the Tiptap HTML wrapper — the classes silently do nothing. The rendered HTML looks unstyled.
**Why it happens:** @tailwindcss/typography is not installed. `prose` is that plugin's utility.
**How to avoid:** Use `[&_p]:mb-4 [&_h2]:text-2xl` etc. on the wrapper div.
**Warning signs:** `<p>` tags inside rendered content have no margin and look wall-of-text.

### Pitfall 2: SSR crash in BlogShareButtons
**What goes wrong:** `window.location.href` called at render time in a Server Component or during SSR hydration → `ReferenceError: window is not defined`.
**Why it happens:** Share buttons need the full URL which requires `window` — only available in browser.
**How to avoid:** Either pass the canonical URL as a prop from the Server Component parent (construct from `process.env.NEXT_PUBLIC_SITE_URL + '/blog/' + slug`), or guard with `typeof window !== 'undefined'`. The prop approach is cleaner.

### Pitfall 3: Blog category filter causes full page reload
**What goes wrong:** Using `<a href="/blog?category=...">` for category tabs causes a full navigation, losing scroll position and feeling slow.
**Why it happens:** Plain anchor tags do full navigation.
**How to avoid:** Use `router.push()` from `useRouter()` in a `use client` component. The page re-renders server-side but feels like SPA navigation in Next.js App Router.

### Pitfall 4: Intersection Observer fires on every scroll tick
**What goes wrong:** Too many observers, too-tight thresholds, and `setActiveId` fires on every scroll, causing jank.
**Why it happens:** Threshold 0 fires at first pixel in/out.
**How to avoid:** Use `rootMargin: '-30% 0px -60% 0px'` so only elements passing through the middle 10% of the viewport trigger updates.

### Pitfall 5: About page images need a scoped Storage bucket path
**What goes wrong:** Using the `product-images` bucket for about page images causes namespace collisions and confusing admin UX.
**Why it happens:** ImageUploader uses `${productId}/${filename}` path. About page images don't have a product ID.
**How to avoid:** Create a separate `content-images` Supabase Storage bucket. Use path `about/${sectionId}/${timestamp}-${filename}`. A simplified version of ImageUploader (single image, no drag-reorder) suffices for about page sections.

### Pitfall 6: `params` must be awaited (Next.js 15)
**What goes wrong:** `const { slug } = params` without `await` → TypeScript error and runtime warning.
**Why it happens:** Next.js 15 made params a Promise. The existing `/catalog/[slug]/page.tsx` already shows the correct pattern.
**How to avoid:** `const { slug } = await params` — already enforced in existing pages.

### Pitfall 7: Blog `published_at` ordering for drafts
**What goes wrong:** Draft posts (published=false) have `published_at = null`. If the public query includes them (e.g. RLS not enabled, or admin viewing), null dates cause ordering issues.
**Why it happens:** `.order('published_at', { ascending: false })` — nulls sort last in PostgreSQL by default.
**How to avoid:** RLS policy `using (published = true)` prevents drafts reaching public queries. The admin query intentionally includes drafts — order by `created_at` for admin view.

### Pitfall 8: AdminSidebar is a static array — new links require file edit
**What goes wrong:** Phase 7 admin routes exist but don't appear in the sidebar.
**Why it happens:** `NAV_LINKS` array in `AdminSidebar.tsx` is hardcoded. Phase 6 deferred blog/subscriber links.
**How to avoid:** Add the four new links to NAV_LINKS as part of this phase. This is the only existing file that needs sidebar modification.

---

## Admin Routes Summary

| Route | Manages | HTTP verbs |
|-------|---------|------------|
| `/admin/pages` | About page sections (title, body, image_url per section) | Page: GET, API: PUT |
| `/admin/faqs` | FAQ list; inline "New FAQ" form; link to edit | Page: GET, API: POST |
| `/admin/faqs/[id]` | Edit/delete single FAQ | Page: GET, API: PUT/DELETE |
| `/admin/blog` | Blog post list; link to new/edit | Page: GET |
| `/admin/blog/new` | Create blog post | Page: GET, API: POST |
| `/admin/blog/[id]` | Edit/delete blog post | Page: GET, API: PUT/DELETE |
| `/admin/shipping` | Shipping rates, timeframes, copy | Page: GET, API: PUT (reuse /api/admin/settings) |

**Shipping admin reuses `/api/admin/settings`:** The shipping admin form can POST to the existing `/api/admin/settings` PUT endpoint — it already handles arbitrary key/value upserts. No new API route needed for shipping.

---

## Blog Slug Generation

Reuse the exact `generateSlug` function from `ProductForm.tsx`:

```typescript
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
```

Auto-generate on blur (matching ProductForm behaviour): when admin types the title and tabs out of the title field, auto-fill the slug field. Slug remains editable. On edit form, slug field is read-only or manually editable with a warning ("changing the slug breaks existing links").

**Slug uniqueness:** The `slug` column has a `unique` constraint. If INSERT fails with 23505 (unique_violation), return HTTP 409 from the API route with a descriptive error message.

---

## Images on the About Page

The existing `ImageUploader.tsx` supports multiple images with drag-reorder (for products). About page sections need a simpler single-image uploader — one image per section, no drag-reorder needed.

**Approach:** Build a `SingleImageUploader` component (simplified subset of ImageUploader):
- Same dnd-kit-free, Supabase Storage direct upload pattern
- Upload path: `content-images` bucket, path `about/${sectionId}/${timestamp}-${filename}`
- If `content-images` bucket doesn't exist, create it in Supabase dashboard (public bucket, same as `product-images`)
- `onImageChange: (url: string | null) => void` callback

This keeps parity with the existing upload UX without the complexity of multi-image reorder.

---

## Wave / Dependency Structure

The phase has a natural two-wave structure.

### Wave 1 — Foundation (must complete first)
These create the database tables and admin management UI. Nothing else can be built without them.

1. **Database schema** — Create tables `about_sections`, `faqs`, `blog_posts` in Supabase. Add keys to `settings` for shipping. Extend `src/types/supabase.ts`.
2. **Admin sidebar update** — Add four new nav links to `AdminSidebar.tsx`.
3. **Shipping admin** — `/admin/shipping` page + `ShippingForm.tsx`. Uses existing `/api/admin/settings` endpoint. No new API route.
4. **FAQ admin** — `/admin/faqs` + `/admin/faqs/[id]` + `FaqForm.tsx` + `/api/admin/faqs` routes.
5. **Blog admin** — `/admin/blog` + `/admin/blog/new` + `/admin/blog/[id]` + `BlogPostForm.tsx` + `/api/admin/blog` routes.
6. **About admin** — `/admin/pages` + `AboutPagesForm.tsx` + `SingleImageUploader.tsx` + `content-images` Storage bucket + `/api/admin/pages` route.

### Wave 2 — Public pages (can start after Wave 1 tables exist)
These read from the tables created in Wave 1. They can all be built in parallel with each other.

7. **Shipping page** — `/shipping/page.tsx` (Server Component). Reads from `settings` table. Fully static, no interactive elements.
8. **FAQ page** — `/faq/page.tsx` (Server Component) + `FaqAccordion.tsx` (use client). Reads from `faqs` table.
9. **About page** — `/about/page.tsx` (Server Component) + `AboutStickyNav.tsx` (use client) + `AboutSection.tsx`. Reads from `about_sections` table.
10. **Blog listing** — `/blog/page.tsx` (Server Component) + `BlogCategoryFilter.tsx` (use client). Reads from `blog_posts`.
11. **Blog post** — `/blog/[slug]/page.tsx` (Server Component) + `BlogShareButtons.tsx` + `BlogRelatedPosts.tsx`. Reads from `blog_posts`.

Items 7–11 in Wave 2 are independent of each other and can be built in any order or in parallel.

---

## Open Questions

1. **`content-images` Storage bucket**
   - What we know: product images go in `product-images` bucket. About page images should be separate.
   - What's unclear: Whether the bucket already exists in the Supabase project.
   - Recommendation: Plan step should include "create `content-images` bucket if not present" as an explicit task. RLS policy: public read (same as product-images).

2. **Blog featured image — same bucket or separate?**
   - What we know: Blog posts have a `featured_image` URL field.
   - Recommendation: Use the same `content-images` bucket with path `blog/${postId}/${timestamp}-${filename}`. No separate bucket needed.

3. **About page — seed data for the four sections**
   - What we know: The admin form lets Unoma edit section content. On first deploy, the `about_sections` table will be empty.
   - Recommendation: The plan should include a seed step: INSERT the four static rows (founder-story, brand-mission, why-loc-beads, contact) with placeholder body content. Otherwise `/admin/pages` shows nothing and there's no way to add sections from the UI (sections are fixed — you edit, not create).

4. **Shipping page — fallback values**
   - What we know: Shipping rates are stored in `settings` table. On first deploy these keys may not exist.
   - Recommendation: Public `/shipping/page.tsx` should have hardcoded fallback values (₦3,000 / ₦4,500 / delivery timeframes) to prevent an empty shipping page before admin edits the settings. Or seed the settings on first deploy.

---

## Code Examples (verified from codebase)

### Existing auth guard pattern (copy verbatim)
```typescript
// Source: /src/app/(admin)/admin/products/[id]/page.tsx
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/admin/login')
```

### Existing single-row fetch with notFound (copy verbatim)
```typescript
// Source: /src/app/(admin)/admin/products/[id]/page.tsx
const result = await adminClient
  .from('products')
  .select('*')
  .eq('id', id)
  .single()
if (result.error || !result.data) notFound()
const row = result.data
```

### Existing async params pattern (copy verbatim)
```typescript
// Source: /src/app/catalog/[slug]/page.tsx
interface PageProps { params: Promise<{ slug: string }> }
export default async function Page({ params }: PageProps) {
  const { slug } = await params
```

### Existing toast pattern (copy verbatim)
```typescript
// Source: /src/app/(admin)/_components/ProductForm.tsx
const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
function showToast(type: 'success' | 'error', message: string) {
  setToast({ type, message })
  setTimeout(() => setToast(null), 3000)
}
```

### Existing Tiptap usage (copy verbatim, immediatelyRender: false is required)
```typescript
// Source: /src/app/(admin)/_components/RichTextEditor.tsx
const editor = useEditor({
  extensions: [StarterKit],
  content: value,
  immediatelyRender: false,   // REQUIRED for Next.js App Router SSR
  onUpdate: ({ editor }) => { onChange(editor.getHTML()) },
})
```

### Existing settings upsert pattern (how to reuse for shipping)
```typescript
// Source: /src/app/api/admin/settings/route.ts
await adminClient
  .from('settings')
  .upsert(rows, { onConflict: 'key' })
```

### WhatsApp URL helper (use existing BUSINESS constant)
```typescript
// Source: /src/lib/config/business.ts
import { BUSINESS } from '@/lib/config/business'
// CTA href for international shipping inquiry:
BUSINESS.whatsapp.url('Hi, I would like to enquire about international shipping')
```

---

## Sources

### Primary (HIGH confidence — read from actual codebase)
- `/src/types/supabase.ts` — current Database type, Relationships: [] pattern confirmed
- `/src/app/(admin)/_components/RichTextEditor.tsx` — Tiptap setup, immediatelyRender: false confirmed
- `/src/app/(admin)/_components/ProductForm.tsx` — toast, slug generation, form pattern confirmed
- `/src/app/(admin)/_components/ImageUploader.tsx` — Supabase Storage direct upload, bucket path, dnd-kit usage confirmed
- `/src/app/(admin)/_components/SettingsForm.tsx` — settings key/value pattern confirmed
- `/src/app/(admin)/_components/AdminSidebar.tsx` — NAV_LINKS static array confirmed — requires edit
- `/src/app/api/admin/settings/route.ts` — upsert pattern confirmed, reusable for shipping
- `/src/app/(admin)/layout.tsx` — auth guard pattern in layout confirmed
- `/src/lib/config/business.ts` — BUSINESS.whatsapp.url() helper confirmed
- `/src/lib/checkout/shipping.ts` — Lagos ₦3,000 / other ₦4,500 rates confirmed
- `/src/app/globals.css` — Tailwind v4 `@import "tailwindcss"` + `@theme` confirmed, no @tailwindcss/typography
- `/package.json` — no @tailwindcss/typography dependency confirmed; Tiptap 2.27.x confirmed

### Secondary (MEDIUM confidence)
- Intersection Observer rootMargin `-30% 0px -60% 0px` pattern — widely documented browser API, no library needed
- WhatsApp share URL `https://wa.me/?text=...` (no number) — documented WhatsApp FAQ
- Twitter/X intent URL `https://twitter.com/intent/tweet` — documented Twitter developer docs

---

## Metadata

**Confidence breakdown:**
- Database schema: HIGH — directly derived from existing table patterns in the codebase
- Admin route patterns: HIGH — direct copy of existing admin pages
- Public page patterns: HIGH — direct copy of existing Server Component pages
- Accordion implementation: HIGH — standard React useState, no library
- Intersection observer: MEDIUM — well-known browser API, rootMargin values are conventional
- Share button URLs: MEDIUM — URLs verified from memory of official documentation

**Research date:** 2026-03-26
**Valid until:** 2026-05-01 (stable stack, no fast-moving dependencies)
