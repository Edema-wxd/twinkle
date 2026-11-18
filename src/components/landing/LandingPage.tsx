import { resolveHero } from '@/lib/landing/config'
import { countShopStyles, getLandingFaqs, getLandingProducts, loadLandingConfig, loadShippingInfo, type LandingProduct } from '@/lib/landing/data'
import { getLandingReviews, getProductRatings, type RatingTotals } from '@/lib/landing/reviews'
import { tierFits } from '@/lib/landing/selection'
import { BestSellers } from './BestSellers'
import { FaqAccordion } from './FaqAccordion'
import { FinalCta } from './FinalCta'
import { Hero } from './Hero'
import { HowItWorks } from './HowItWorks'
import { LandingPersistent } from './LandingPersistent'
import { Reviews } from './Reviews'
import { ShippingPayment } from './ShippingPayment'
import { SizeGuideProvider } from './SizeGuide'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')
const absolute = (src: string) => (src.startsWith('http') ? src : `${BASE}${src}`)

/** One Product + Offer per card: the preselected size and pack's real price, in NGN */
function productJsonLd(p: LandingProduct, rating: RatingTotals | undefined) {
  const variant = p.variants.find((v) => v.id === p.selection.variantId)
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.descriptionText || undefined,
    image: p.images.map(absolute),
    brand: { '@type': 'Brand', name: 'Twinkle Locs' },
    url: `${BASE}/catalog/${p.slug}`,
    offers: {
      '@type': 'Offer',
      price: p.defaultPrice,
      priceCurrency: 'NGN',
      availability: tierFits(variant, p.selection.tierQty) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${BASE}/catalog/${p.slug}`,
      seller: { '@type': 'Organization', name: 'Twinkle Locs' },
    },
    // Only with real reviews of this product
    ...(rating && rating.count > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rating.average.toFixed(1), reviewCount: rating.count } }
      : {}),
  }
}

const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, '\\u003c') })

/**
 * The ad landing page, shared by /shop-twinkles and /shop-twinkles/<hero key>
 * (the hero is the only difference). Sections are server components; only the
 * interactive pieces (cards, size guide, email form, floating bar) ship JS.
 */
export async function LandingPage({ heroKey }: { heroKey: string | null }) {
  const [config, shipping] = await Promise.all([loadLandingConfig(), loadShippingInfo()])
  const [products, reviews, faqs, styleCount] = await Promise.all([
    getLandingProducts(config),
    getLandingReviews(config),
    getLandingFaqs(),
    countShopStyles(),
  ])
  const ratings = await getProductRatings(products.map((p) => p.id))

  const hero = resolveHero(config, heroKey)
  const standIn = products[0]?.image ?? null
  const buyable = products.filter((p) => tierFits(p.variants.find((v) => v.id === p.selection.variantId), p.selection.tierQty))
  const cheapest = buyable.reduce<LandingProduct | null>((min, p) => (!min || p.defaultPrice < min.defaultPrice ? p : min), null)

  return (
    <SizeGuideProvider guide={config.sizeGuide}>
      {products.map((p) => (
        <script key={p.id} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(productJsonLd(p, ratings.get(p.id)))} />
      ))}

      <Hero hero={hero} standInImage={standIn} rating={reviews.showRating ? reviews.totals : null} />
      <BestSellers products={products} styleCount={styleCount} stockWarningAt={config.stockWarningAt} />
      <Reviews data={reviews} instagram={config.instagram} featuredSlugs={products.map((p) => p.slug)} />
      <HowItWorks sizeGuide={config.sizeGuide} howItWorks={config.howItWorks} otherDays={shipping.otherDays} />
      <ShippingPayment shipping={shipping} returnsLine={config.returnsLine} />
      <FaqAccordion faqs={faqs} />
      <FinalCta finalCta={config.finalCta} offer={config.welcomeOffer} standInImage={standIn} />

      <LandingPersistent
        productIds={products.map((p) => p.id)}
        lowestPrice={cheapest?.defaultPrice ?? null}
        thumbnail={cheapest?.image ?? null}
        offer={config.welcomeOffer}
      />
    </SizeGuideProvider>
  )
}
