import type { Metadata } from 'next'
import { HeroSection } from '@/components/home/HeroSection'
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection'
import { BrandStorySection } from '@/components/home/BrandStorySection'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { InstagramCTASection } from '@/components/home/InstagramCTASection'
import { FEATURED_PRODUCTS } from '@/lib/mock/products'
import { TESTIMONIALS } from '@/lib/mock/testimonials'

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

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <FeaturedProductsSection products={FEATURED_PRODUCTS} />
      <BrandStorySection />
      <TestimonialsSection testimonials={TESTIMONIALS} />
      <InstagramCTASection />
    </main>
  )
}
