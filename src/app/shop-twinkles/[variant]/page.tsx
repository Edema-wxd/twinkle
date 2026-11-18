import { LandingPage } from '@/components/landing/LandingPage'
import { landingMetadata } from '@/lib/landing/metadata'

// A hero version for testing ad creatives: /shop-twinkles/<key> is the same page
// with that hero. Unknown keys show the main hero (an ad link never 404s).
// Built on first visit, then cached and refreshed like the main page.
export const revalidate = 600
export const dynamicParams = true

export function generateStaticParams(): { variant: string }[] {
  return []
}

type Props = { params: Promise<{ variant: string }> }

export async function generateMetadata({ params }: Props) {
  const { variant } = await params
  return landingMetadata(variant)
}

export default async function ShopTwinklesVariantPage({ params }: Props) {
  const { variant } = await params
  return <LandingPage heroKey={variant} />
}
