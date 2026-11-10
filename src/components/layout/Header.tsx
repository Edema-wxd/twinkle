'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MobileDrawer } from './MobileDrawer'
import { useCart } from '@/lib/cart/CartContext'
import Image from 'next/image'

const navLinks = [
  { href: '/catalog', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/shipping', label: 'Shipping' },
]

export function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const pathname = usePathname()
  const { state, dispatch } = useCart()
  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0)
  const badgeLabel = totalItems > 9 ? '9+' : String(totalItems)

  return (
    <>
      <header className="sticky top-0 z-30 bg-forest border-b border-cream/10 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" aria-label="Twinkle Locs home">
              <Image priority src="https://ta1u3ge9om.ufs.sh/f/fBUPGtLq5gOYxli6v2v9bkGFeW9BCV3IvLqNKgMpAozSZDXJ" alt="Twinkle Locs" width={150} height={50} />
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}
                  className="relative py-2 font-heading text-sm font-medium text-cream/90 hover:text-gold-light transition-colors aria-[current=page]:text-gold-light after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-gold-light after:scale-x-0 aria-[current=page]:after:scale-x-100 after:transition-transform"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <button
                type="button"
                onClick={() => dispatch({ type: 'OPEN_DRAWER' })}
                aria-label={`Open cart${totalItems > 0 ? `, ${totalItems} item${totalItems === 1 ? '' : 's'}` : ''}`}
                className="relative min-h-11 px-1 font-heading text-sm font-medium text-cream/90 hover:text-gold-light transition-colors"
              >
                Cart
                {totalItems > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-2 -right-4 bg-gold text-forest rounded-full text-xs font-heading font-semibold w-5 h-5 flex items-center justify-center"
                  >
                    {badgeLabel}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile: cart + hamburger */}
            <div className="md:hidden flex items-center gap-1 -mr-2">
              <button
                type="button"
                onClick={() => dispatch({ type: 'OPEN_DRAWER' })}
                aria-label={`Open cart${totalItems > 0 ? `, ${totalItems} item${totalItems === 1 ? '' : 's'}` : ''}`}
                className="relative w-11 h-11 flex items-center justify-center text-cream"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 016 0v2" />
                </svg>
                {totalItems > 0 && (
                  <span aria-hidden="true" className="absolute top-1 right-0.5 bg-gold-light text-forest rounded-full text-[10px] font-heading font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {badgeLabel}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
                className="w-11 h-11 flex flex-col items-center justify-center gap-1.5 text-cream"
              >
                <span className="block w-6 h-0.5 bg-current" />
                <span className="block w-6 h-0.5 bg-current" />
                <span className="block w-6 h-0.5 bg-current" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <MobileDrawer isOpen={drawerOpen} onClose={closeDrawer}>
        {/* Drawer header */}
        <div className="flex items-center justify-between mb-8">
          <span className="font-display text-xl text-forest">Twinkle Locs</span>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close navigation menu"
            className="w-11 h-11 -mr-2 flex items-center justify-center text-forest"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer links */}
        <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={closeDrawer}
              aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}
              className="font-heading text-lg font-medium text-charcoal py-3 border-b border-charcoal/10 hover:text-gold-deep aria-[current=page]:text-forest aria-[current=page]:font-semibold transition-colors"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/cart"
            onClick={closeDrawer}
            className="font-heading text-lg font-medium text-charcoal py-3 border-b border-charcoal/10 hover:text-gold-deep transition-colors"
          >
            Cart{totalItems > 0 ? ` (${totalItems})` : ''}
          </Link>
        </nav>

        {/* Drawer footer */}
        <div className="mt-auto pt-8">
          <p className="font-body text-sm text-charcoal/60">
            Premium loc bead accessories
          </p>
        </div>
      </MobileDrawer>
    </>
  )
}
