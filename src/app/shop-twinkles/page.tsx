import { LandingPage } from '@/components/landing/LandingPage'
import { landingMetadata } from '@/lib/landing/metadata'

// Ad landing page. Rebuilt when Admin → Ad landing page is saved (revalidatePath),
// and at least every 10 minutes so prices, stock and reviews stay current.
export const revalidate = 600

export function generateMetadata() {
  return landingMetadata(null)
}

export default function ShopTwinklesPage() {
  return <LandingPage heroKey={null} />
}
