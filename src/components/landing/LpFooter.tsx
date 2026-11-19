import Link from 'next/link'
import { BUSINESS } from '@/lib/config/business'
import { LandingWhatsAppLink } from './LandingWhatsAppLink'
import { InstagramIcon, LockIcon, WhatsAppIcon } from './icons'

const link =
  'inline-flex min-h-11 items-center gap-2 font-body text-sm text-cream/85 underline-offset-4 hover:text-cream hover:underline focus-visible:outline-2 focus-visible:outline-cream'

/**
 * Slim footer for the landing page: the policies and the two ways to reach us.
 * Keeps data-site-footer so the sticky bar and floating buttons step aside for it.
 */
export function LpFooter() {
  return (
    <footer data-site-footer className="border-t border-cream/10 bg-forest text-cream">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-8 md:py-12">
        <nav aria-label="Help and policies">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <li>
              <Link href="/shipping" className={link}>
                Shipping Info
              </Link>
            </li>
            <li>
              <Link href="/returns" className={link}>
                Returns &amp; refunds
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={link}>
                Privacy
              </Link>
            </li>
            <li>
              <LandingWhatsAppLink location="fab" trackAs="footer" className={link}>
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp
              </LandingWhatsAppLink>
            </li>
            <li>
              <a href={BUSINESS.instagram.url} target="_blank" rel="noopener noreferrer" className={link}>
                <InstagramIcon className="h-4 w-4" />
                Instagram @{BUSINESS.instagram.handle}
              </a>
            </li>
          </ul>
        </nav>
        <div className="mt-6 flex flex-col gap-2 border-t border-cream/10 pt-6 font-body text-[13px] text-cream/75 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Twinkle Locs. Handcrafted in Nigeria.</p>
          <p className="inline-flex items-center gap-1.5">
            <LockIcon className="h-3.5 w-3.5" />
            Secure checkout by Paystack
          </p>
        </div>
      </div>
    </footer>
  )
}
