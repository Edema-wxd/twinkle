import type { Metadata } from 'next'
import { HeroSection } from '@/components/home/HeroSection'
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection'
import { BrandStorySection } from '@/components/home/BrandStorySection'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { InstagramCTASection } from '@/components/home/InstagramCTASection'
import { JournalTeaserSection } from '@/components/home/JournalTeaserSection'
import { FaqTeaserSection } from '@/components/home/FaqTeaserSection'
import type { FaqItem } from '@/components/faq/FaqAccordion'
import { db, products as productsTable, testimonials as testimonialsTable, blogPosts as blogPostsTable, faqs as faqsTable } from '@/db'
import { formatNaira, getShippingInfo } from '@/lib/checkout/shippingInfo'
import { applyStockToProducts } from '@/lib/stock'
import { faqAnswerHtml, htmlToText, toBlogCard, type BlogCardPost } from '@/lib/content'
import { eq, and, asc, desc } from 'drizzle-orm'
import type { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import type { Testimonial } from '@/components/home/TestimonialsSection'

// Shipping figures come from the same settings checkout charges from
export async function generateMetadata(): Promise<Metadata> {
  const info = await getShippingInfo()
  const title = 'Loc Beads Nigeria - Gold, Silver & Crystal | Twinkle Locs'
  const description = `Buy handcrafted loc beads online in Nigeria. Gold, silver and crystal styles from NGN 15,000. Lagos delivery from ${formatNaira(info.lagosFrom)}, same day in most areas; nationwide in ${info.otherDays}.`
  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Twinkle Locs – Nigerian Loc Beads' }],
      type: 'website',
    },
  }
}

const storeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Twinkle Locs',
  description:
    'Handcrafted loc bead accessories made in Nigeria. Gold, silver and crystal loc beads in multiple sizes for loc wearers.',
  url: 'https://twinklelocs.com',
  logo: 'https://twinklelocs.com/images/Logo.png',
  image: 'https://twinklelocs.com/og-image.jpg',
  telephone: '+2349118888010',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Lagos',
    addressCountry: 'NG',
  },
  priceRange: 'NGN 3,500 - NGN 103,000',
  currenciesAccepted: 'NGN',
  paymentAccepted: 'Bank Transfer, Card, WhatsApp Order',
  areaServed: [{ '@type': 'Country', name: 'Nigeria' }],
  founder: { '@type': 'Person', name: 'Unoma' },
  sameAs: ['https://www.instagram.com/twinklelocs', 'https://wa.me/2349118888010'],
}

export default async function HomePage() {
  const [productRows, testimonialRows] = await Promise.all([
    db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.isFeatured, true), eq(productsTable.isActive, true)))
      .orderBy(desc(productsTable.createdAt))
      .limit(4),
    db
      .select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.isActive, true))
      .orderBy(asc(testimonialsTable.displayOrder)),
  ]).catch((err) => {
    console.error('[HomePage] DB query failed:', err)
    return [[], []] as const
  })

  // Content teasers load independently so a content-table hiccup never blanks the shop
  const [postRows, faqRows] = await Promise.all([
    db
      .select()
      .from(blogPostsTable)
      .where(eq(blogPostsTable.published, true))
      .orderBy(desc(blogPostsTable.publishedAt))
      .limit(3)
      .catch((err) => {
        console.error('[HomePage] blog query failed:', err)
        return []
      }),
    db
      .select()
      .from(faqsTable)
      .where(eq(faqsTable.isFeatured, true))
      .orderBy(asc(faqsTable.displayOrder))
      .limit(6)
      .catch((err) => {
        console.error('[HomePage] faq query failed:', err)
        return []
      }),
  ])

  const latestPosts: BlogCardPost[] = postRows.map(toBlogCard)
  const featuredFaqs: FaqItem[] = faqRows.map((r) => {
    const answerHtml = faqAnswerHtml(r.answer)
    return { id: r.id, category: r.category, question: r.question, answerHtml, answerText: htmlToText(answerHtml) }
  })

  const featuredBase: Product[] = productRows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    material: row.material as ProductMaterial,
    is_featured: row.isFeatured,
    variants: row.variants as unknown as ProductVariant[],
    price_min: row.priceMin,
    price_max: row.priceMax,
    created_at: row.createdAt.toISOString(),
    images: row.images?.length ? row.images : undefined,
  }))

  const featuredProducts = await applyStockToProducts(featuredBase)

  const testimonials: Testimonial[] = testimonialRows.map((row) => ({
    id: row.id,
    name: row.name,
    quote: row.quote,
  }))

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(storeJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <HeroSection />
      <FeaturedProductsSection products={featuredProducts} />
      <BrandStorySection />
      <TestimonialsSection testimonials={testimonials} />
      <FaqTeaserSection faqs={featuredFaqs} />
      <JournalTeaserSection posts={latestPosts} />
      <InstagramCTASection />
    </div>
  )
}
