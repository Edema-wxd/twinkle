import Link from 'next/link'
import { BUSINESS } from '@/lib/config/business'

const footerLinks = [
  { href: '/catalog', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/shipping', label: 'Shipping Info' },
]

export function Footer() {
  return (
    <footer className="bg-cocoa text-cream">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <p className="font-display text-2xl text-gold mb-3">Twinkle Locs</p>
            <p className="font-body text-sm text-cream/70 leading-relaxed">
              Premium loc bead accessories for your loc journey. Made with love for the African diaspora.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-cream/60 mb-4">
              Navigation
            </h3>
            <ul className="flex flex-col gap-2">
              {footerLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-body text-sm text-cream/80 hover:text-gold transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-cream/60 mb-4">
              Connect
            </h3>
            <ul className="flex flex-col gap-2">
              <li>
                <a
                  href={BUSINESS.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-sm text-cream/80 hover:text-gold transition-colors"
                >
                  Instagram @{BUSINESS.instagram.handle}
                </a>
              </li>
              <li>
                <a
                  href={BUSINESS.whatsapp.url()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-sm text-cream/80 hover:text-gold transition-colors"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-cream/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs text-cream/40">
            &copy; {new Date().getFullYear()} Twinkle Locs. All rights reserved.
          </p>
          <p className="font-body text-xs text-cream/40">
            Made with love in Nigeria
          </p>
        </div>
      </div>
    </footer>
  )
}
