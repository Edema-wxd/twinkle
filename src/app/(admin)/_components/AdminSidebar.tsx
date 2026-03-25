'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logoutAction } from '@/app/(admin)/admin/login/actions'

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/products', label: 'Products', exact: false },
  { href: '/admin/orders', label: 'Orders', exact: false },
  { href: '/admin/reviews', label: 'Reviews', exact: false },
  { href: '/admin/settings', label: 'Settings', exact: false },
]

function NavLink({
  href,
  label,
  exact,
  onClick,
}: {
  href: string
  label: string
  exact: boolean
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block px-4 py-2.5 rounded-lg text-sm font-heading font-medium transition-colors ${
        isActive
          ? 'bg-gold text-white'
          : 'text-stone-300 hover:bg-stone-700 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-6 border-b border-stone-700">
        <span className="font-display text-2xl text-gold leading-none">
          Twinkle Locs
        </span>
        <p className="font-heading text-xs text-stone-400 mt-0.5 tracking-widest uppercase">
          Admin
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            exact={link.exact}
            onClick={onLinkClick}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-stone-700">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full px-4 py-2.5 rounded-lg text-sm font-heading font-medium text-stone-300 hover:bg-stone-700 hover:text-white transition-colors text-left"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-stone-900 min-h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile: top bar with hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 bg-stone-900 border-b border-stone-700">
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="p-2 text-stone-300 hover:text-white"
        >
          {/* Hamburger icon */}
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <span className="ml-3 font-display text-xl text-gold">Twinkle Locs</span>
      </div>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer panel */}
          <aside className="relative w-64 bg-stone-900 h-full shadow-xl">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-4 p-1 text-stone-400 hover:text-white"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <SidebarContent onLinkClick={() => setIsOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
