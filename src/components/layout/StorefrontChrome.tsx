'use client'

import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { Footer } from './Footer'
import { WhatsAppButton } from '@/components/WhatsAppButton'

export function StorefrontChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) {
    return <>{children}</>
  }
  // The floating button would cover the main buttons on phones here: Pay (checkout),
  // Checkout (cart), and the order page, which has its own WhatsApp buttons
  const showWhatsApp = !['/checkout', '/cart', '/orders/'].some((p) => pathname.startsWith(p))
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cream focus:px-4 focus:py-3 focus:font-heading focus:text-sm focus:font-semibold focus:text-forest focus:shadow-lg"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
      <Footer />
      {showWhatsApp && <WhatsAppButton />}
    </>
  )
}
