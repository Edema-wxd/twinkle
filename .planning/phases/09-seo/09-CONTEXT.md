# Phase 9: SEO - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Every public page gets correct metadata, OpenGraph tags, structured data, a sitemap, and clean canonical URLs — making the site discoverable by search engines and shareable across social platforms (WhatsApp, Facebook, Twitter). Admin routes and draft content are excluded. No new user-facing features.

</domain>

<decisions>
## Implementation Decisions

### Title & description patterns
- Format: `Page name | Twinkle Locs` for all pages
- Homepage title: `Twinkle Locs | Nigerian Loc Beads & Accessories`
- Meta descriptions for product pages: use `seo_description` field if set; fall back to trimmed product description (~155 chars) if not
- Meta descriptions for static pages (/about, /faq, /shipping, /catalog): hardcoded in each page component — no Supabase lookup

### Structured data scope
- **Product pages**: Schema.org Product schema (required by spec)
- **Product schema fields**: Claude's discretion — include core fields + AggregateRating from reviews if reviews exist and improve Rich Results eligibility
- **BreadcrumbList**: on product detail pages (path: Twinkle Locs > Catalog > [Product Name])
- **FAQPage**: on /faq page — marks up accordion items for Google rich results
- **BlogPosting**: on individual /blog/[slug] pages — includes author, publish date, headline
- No Organization schema (deferred or Claude's discretion)

### OpenGraph image strategy
- Product pages: use product's first image from Supabase Storage
- Blog post pages: use post's featured image from Supabase
- All other pages (homepage, /catalog, /faq, /shipping, /about): one global brand image asset
- Global brand image: developer will provide asset — place at `/public/og-image.jpg` (1200×630)
- No auto-generated OG images — static or Supabase-sourced only

### Sitemap configuration
- Implementation: `app/sitemap.ts` dynamic route handler (fetches Supabase at request time)
- Included URLs: homepage, /catalog, all `/catalog/[slug]` active products, /about, /faq, /shipping, /blog, all `/blog/[slug]` published posts
- Excluded: /admin/*, /cart, /orders/*, /api/*
- `robots.txt` included: allow all crawlers, block `/admin/*`, link to /sitemap.xml

### Claude's Discretion
- Canonical URL handling: middleware already redirects uppercase → lowercase; Claude decides whether to add `<link rel="canonical">` tags on top or rely on middleware alone
- Exact sitemap priority/changefreq values
- Product schema fields selection (core vs core + AggregateRating judgment)
- robots.txt exact syntax

</decisions>

<specifics>
## Specific Ideas

- Uppercase-to-lowercase slug enforcement is already handled by middleware from Phase 1 — SEO phase should build on this, not reimplement it
- Products are fetched from Supabase with `.eq('is_active', true)` — sitemap should use same filter

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-seo*
*Context gathered: 2026-03-31*
