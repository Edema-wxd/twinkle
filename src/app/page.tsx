import type { Metadata } from 'next'
import { HeroSection } from '@/components/home/HeroSection'
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection'
import { BrandStorySection } from '@/components/home/BrandStorySection'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { InstagramCTASection } from '@/components/home/InstagramCTASection'
import { db, products as productsTable, testimonials as testimonialsTable } from '@/db'
import { eq, and, asc, desc } from 'drizzle-orm'
import type { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import type { Testimonial } from '@/components/home/TestimonialsSection'

export const metadata: Metadata = {
  title: {
    absolute: 'Twinkle Locs | Nigerian Loc Beads & Accessories',
  },
  description: 'Handcrafted loc bead accessories designed for the modern loc wearer. Shop premium Nigerian loc beads — gold, silver, crystal styles.',
  openGraph: {
    title: 'Twinkle Locs | Nigerian Loc Beads & Accessories',
    description: 'Handcrafted loc bead accessories designed for the modern loc wearer.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Twinkle Locs – Nigerian Loc Beads' }],
    type: 'website',
  },
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
  ])

  const featuredProducts: Product[] = productRows.map((row) => ({
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

  const testimonials: Testimonial[] = testimonialRows.map((row) => ({
    id: row.id,
    name: row.name,
    quote: row.quote,
  }))

  return (
    <main>
      <HeroSection />
      <FeaturedProductsSection products={featuredProducts} />
      <BrandStorySection />
      <TestimonialsSection testimonials={testimonials} />
      <InstagramCTASection />
    </main>
  )
}
