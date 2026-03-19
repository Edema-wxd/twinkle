'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { MobileDrawer } from './MobileDrawer'

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

  return (
    <>
      <header className="sticky top-0 z-30 bg-cream border-b border-cocoa/10 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="font-display text-2xl text-cocoa tracking-wide hover:text-gold transition-colors"
            >
              Twinkle Locs
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="font-heading text-sm font-medium text-charcoal hover:text-gold transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/cart"
                aria-label="View cart"
                className="font-heading text-sm font-medium text-charcoal hover:text-gold transition-colors"
              >
                Cart
              </Link>
            </div>

            {/* Mobile: hamburger button */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              className="md:hidden flex flex-col justify-center gap-1.5 p-2 text-cocoa"
            >
              <span className="block w-6 h-0.5 bg-current" />
              <span className="block w-6 h-0.5 bg-current" />
              <span className="block w-6 h-0.5 bg-current" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <MobileDrawer isOpen={drawerOpen} onClose={closeDrawer}>
        {/* Drawer header */}
        <div className="flex items-center justify-between mb-8">
          <span className="font-display text-xl text-cocoa">Twinkle Locs</span>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close navigation menu"
            className="text-cocoa p-1"
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
              className="font-heading text-lg font-medium text-cocoa py-3 border-b border-cocoa/10 hover:text-gold transition-colors"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/cart"
            onClick={closeDrawer}
            className="font-heading text-lg font-medium text-cocoa py-3 border-b border-cocoa/10 hover:text-gold transition-colors"
          >
            Cart
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
