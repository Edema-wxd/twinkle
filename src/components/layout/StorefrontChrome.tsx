'use client'

import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { Footer } from './Footer'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { LANDING_PATH } from '@/lib/landing/config'

export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) {
    return <>{children}</>
  }
  const skipLink = (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cream focus:px-4 focus:py-3 focus:font-heading focus:text-sm focus:font-semibold focus:text-forest focus:shadow-lg"
    >
      Skip to content
    </a>
  )
  // Ad landing page: its layout (src/app/shop-twinkles) brings the announcement bar,
  // the reduced header (logo + cart), <main>, the slim footer and its own WhatsApp button
  if (pathname === LANDING_PATH || pathname.startsWith(LANDING_PATH + '/')) {
    return (
      <>
        {skipLink}
        {children}
      </>
    )
  }
  // The floating button would cover the main buttons on phones here: Pay (checkout),
  // Checkout (cart), and the order page, which has its own WhatsApp buttons
  const showWhatsApp = !['/checkout', '/cart', '/orders/'].some((p) => pathname.startsWith(p))
  return (
    <>
      {skipLink}
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
      <Footer />
      {showWhatsApp && <WhatsAppButton />}
    </>
  )
}
