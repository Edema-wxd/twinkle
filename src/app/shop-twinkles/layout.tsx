import { AnnouncementBar, announcementText } from '@/components/landing/AnnouncementBar'
import { LpFooter } from '@/components/landing/LpFooter'
import { LpHeader } from '@/components/landing/LpHeader'
import { loadLandingConfig, loadShippingInfo } from '@/lib/landing/data'

/**
 * Chrome for the ad landing page (StorefrontChrome leaves it out here): the
 * announcement bar above a reduced header (logo + cart), and a slim footer.
 * Here rather than in StorefrontChrome because the bar's text comes from the
 * database and must sit above the header.
 */
export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const [config, shipping] = await Promise.all([loadLandingConfig(), loadShippingInfo()])
  return (
    <>
      <AnnouncementBar text={announcementText(config.announcement, shipping)} />
      <LpHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <LpFooter />
    </>
  )
}
