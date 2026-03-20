import { HeroSection } from '@/components/home/HeroSection'
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection'
import { BrandStorySection } from '@/components/home/BrandStorySection'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { InstagramCTASection } from '@/components/home/InstagramCTASection'
import { FEATURED_PRODUCTS } from '@/lib/mock/products'
import { TESTIMONIALS } from '@/lib/mock/testimonials'

export const metadata = {
  title: 'Twinkle Locs — Premium Loc Bead Accessories',
  description: 'Handcrafted loc bead accessories designed for the modern loc wearer. Shop premium Nigerian loc accessories.',
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
