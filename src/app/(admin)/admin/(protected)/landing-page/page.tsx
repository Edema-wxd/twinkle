import { asc, eq, sql } from 'drizzle-orm'
import { requireAdminSession } from '@/lib/auth/server'
import { db, faqs, products, reviews } from '@/db'
import { DEFAULT_LANDING_FAQS, LANDING_FAQ_CATEGORY, LANDING_PATH, hasPlaceholder } from '@/lib/landing/config'
import { getLandingConfig } from '@/lib/landing/config.server'
import { getShippingInfo } from '@/lib/checkout/shippingInfo'
import type { ProductVariant } from '@/lib/types/product'
import { autoAnnouncement, type LandingProductOption } from '../../../_lib/landing-form'
import { LandingPageForm } from '../../../_components/LandingPageForm'
import { LandingFaqsPanel, type LandingFaqRow } from '../../../_components/LandingFaqsPanel'

export const metadata = {
  title: 'Ad landing page - Twinkle Locs Admin',
}

async function loadProducts(): Promise<LandingProductOption[]> {
  try {
    const rows = await db
      .select({ slug: products.slug, name: products.name, material: products.material, variants: products.variants })
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(asc(products.name))
    return rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      material: r.material,
      variants: (Array.isArray(r.variants) ? (r.variants as ProductVariant[]) : []).map((v) => ({
        name: v.name,
        packs: [...new Set((v.price_tiers ?? []).map((t) => t.qty).filter((q) => q > 0))].sort((a, b) => a - b),
      })),
    }))
  } catch (err) {
    console.error('[admin/landing-page] failed to load products:', err)
    return []
  }
}

async function loadFaqs(): Promise<LandingFaqRow[]> {
  try {
    const rows = await db
      .select({ id: faqs.id, question: faqs.question, answer: faqs.answer })
      .from(faqs)
      .where(eq(faqs.category, LANDING_FAQ_CATEGORY))
      .orderBy(asc(faqs.displayOrder), asc(faqs.createdAt))
    return rows.map((r) => ({ id: r.id, question: r.question, needsSignOff: hasPlaceholder(r.question) || hasPlaceholder(r.answer) }))
  } catch (err) {
    console.error('[admin/landing-page] failed to load FAQs:', err)
    return []
  }
}

async function loadReviewStats() {
  try {
    const [row] = await db
      .select({
        totalReviews: sql<number>`count(*)::int`,
        photoReviews: sql<number>`(count(*) filter (where ${reviews.photoUrl} is not null and ${reviews.photoPermission}))::int`,
      })
      .from(reviews)
    return { totalReviews: Number(row?.totalReviews ?? 0), photoReviews: Number(row?.photoReviews ?? 0) }
  } catch (err) {
    console.error('[admin/landing-page] failed to count reviews:', err)
    return { totalReviews: 0, photoReviews: 0 }
  }
}

export default async function AdminLandingPage() {
  // Belt-and-braces auth check (CVE-2025-29927): layout.tsx also checks
  await requireAdminSession()

  const [config, productOptions, shipping, faqRows, reviewStats] = await Promise.all([
    getLandingConfig(),
    loadProducts(),
    getShippingInfo(),
    loadFaqs(),
    loadReviewStats(),
  ])

  // With no landing FAQs yet the page shows the drafts, so count theirs
  const faqSignOffCount =
    faqRows.length > 0
      ? faqRows.filter((f) => f.needsSignOff).length
      : DEFAULT_LANDING_FAQS.filter((f) => hasPlaceholder(f.question) || hasPlaceholder(f.answer)).length

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')

  return (
    <div className="max-w-4xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Ad landing page</h1>
          <p className="mt-1 text-sm text-stone-400">
            Everything on {LANDING_PATH}, the page your Instagram and TikTok ads point to. Sections are in the same order as on the page. Saving updates
            the live page straight away, no redeploy needed.
          </p>
        </div>
        <a
          href={LANDING_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-200 transition-colors hover:bg-stone-700 hover:text-white"
        >
          View page &#8599;
        </a>
      </div>

      <LandingPageForm
        initialConfig={config}
        products={productOptions}
        autoAnnouncementText={autoAnnouncement(shipping.freeLagosOver, shipping.otherDays)}
        freeLagosOver={shipping.freeLagosOver}
        reviewStats={reviewStats}
        faqSignOffCount={faqSignOffCount}
        siteUrl={siteUrl}
        faqPanel={<LandingFaqsPanel faqs={faqRows} />}
      />
    </div>
  )
}
