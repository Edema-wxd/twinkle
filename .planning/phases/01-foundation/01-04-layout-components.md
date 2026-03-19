---
phase: 01-foundation
plan: "04"
type: execute
wave: 3
depends_on: ["01-02"]
files_modified:
  - src/components/layout/Header.tsx
  - src/components/layout/Footer.tsx
  - src/components/layout/MobileDrawer.tsx
  - src/components/WhatsAppButton.tsx
  - src/app/layout.tsx
  - src/app/page.tsx
autonomous: false

must_haves:
  truths:
    - "Header is visible at the top of every page with the Twinkle Locs logo text and navigation links"
    - "Footer is visible at the bottom of every page"
    - "At 375px viewport width (iPhone SE), the desktop nav links are hidden and a hamburger button is visible"
    - "Tapping the hamburger button opens the mobile drawer from the left with nav links visible"
    - "Tapping the backdrop or pressing Escape closes the mobile drawer"
    - "A green circular WhatsApp button is visible in the bottom-right corner on every page"
    - "Tapping the WhatsApp button opens wa.me/[number] in a new tab"
  artifacts:
    - path: "src/components/layout/Header.tsx"
      provides: "Site header with logo, desktop nav, mobile menu trigger"
      min_lines: 30
    - path: "src/components/layout/Footer.tsx"
      provides: "Site footer with links and brand info"
      min_lines: 20
    - path: "src/components/layout/MobileDrawer.tsx"
      provides: "Slide-in mobile navigation drawer"
      contains: "translate-x"
    - path: "src/components/WhatsAppButton.tsx"
      provides: "Fixed WhatsApp floating button"
      contains: "wa.me"
    - path: "src/app/layout.tsx"
      provides: "Root layout rendering Header, Footer, and WhatsAppButton on every page"
      contains: "WhatsAppButton"
  key_links:
    - from: "src/app/layout.tsx"
      to: "src/components/WhatsAppButton.tsx"
      via: "Import and render in root layout body"
      pattern: "WhatsAppButton"
    - from: "src/app/layout.tsx"
      to: "src/components/layout/Header.tsx"
      via: "Import and render in root layout body"
      pattern: "<Header"
    - from: "src/components/layout/Header.tsx"
      to: "src/components/layout/MobileDrawer.tsx"
      via: "Header owns the isOpen state, passes it and onClose to MobileDrawer"
      pattern: "MobileDrawer"
---

<objective>
Build the three shared layout components (Header, MobileDrawer, Footer) and the WhatsApp floating button, then wire them all into the root layout so they appear on every page of the site.

Purpose: These components frame every page in every subsequent phase. Getting mobile navigation right here means Phase 2 onward can focus on content, not layout plumbing.
Output: Four components committed and rendered in root layout. Mobile drawer opens and closes. WhatsApp button links to wa.me.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mac/Documents/GitHub/twinkle/.planning/PROJECT.md
@/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-RESEARCH.md
@/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-02-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build Header, MobileDrawer, and Footer components</name>
  <files>
    src/components/layout/Header.tsx
    src/components/layout/MobileDrawer.tsx
    src/components/layout/Footer.tsx
  </files>
  <action>
Create `src/components/layout/MobileDrawer.tsx` — state-driven, pure React + Tailwind, no external library:

```typescript
'use client'

import { useEffect } from 'react'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function MobileDrawer({ isOpen, onClose, children }: MobileDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-cocoa/60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      {/* Drawer panel */}
      <nav
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-cream flex flex-col p-6 shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </nav>
    </>
  )
}
```

Create `src/components/layout/Header.tsx` — owns the drawer open/close state:

```typescript
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
```

Create `src/components/layout/Footer.tsx`:

```typescript
import Link from 'next/link'

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
                  href="https://instagram.com/twinklelocs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-sm text-cream/80 hover:text-gold transition-colors"
                >
                  Instagram @twinklelocs
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '234000000000'}`}
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
```

Delete `.gitkeep` if present:

```bash
rm -f /Users/mac/Documents/GitHub/twinkle/src/components/layout/.gitkeep
rm -f /Users/mac/Documents/GitHub/twinkle/src/components/ui/.gitkeep
```
  </action>
  <verify>
```bash
npx tsc --noEmit
```
Should exit 0. If there are errors in component files, fix them before proceeding to Task 2.
  </verify>
  <done>
Header.tsx, MobileDrawer.tsx, and Footer.tsx exist in src/components/layout/. All use design token classes (bg-cream, text-cocoa, font-display, etc.). TypeScript check passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Build WhatsApp button and wire everything into root layout</name>
  <files>
    src/components/WhatsAppButton.tsx
    src/app/layout.tsx
    src/app/page.tsx
  </files>
  <action>
Create `src/components/WhatsAppButton.tsx`:

```typescript
export function WhatsAppButton() {
  const phoneNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '234000000000'
  const message = encodeURIComponent("Hi, I'm interested in your loc beads")

  return (
    <a
      href={`https://wa.me/${phoneNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform hover:scale-110 active:scale-95"
    >
      {/* WhatsApp SVG logo */}
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.847L.057 23.882l6.198-1.448A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.031-1.384l-.361-.214-3.681.861.882-3.574-.235-.373A9.8 9.8 0 012.182 12c0-5.42 4.399-9.818 9.818-9.818 5.42 0 9.818 4.399 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z" />
      </svg>
    </a>
  )
}
```

Update `src/app/layout.tsx` to import and render all three layout components and the WhatsApp button. Make sure to read the current state of layout.tsx first (it was updated in Plan 02 to include font wiring) and preserve those font imports:

The layout must:
1. Keep the font variable imports from Plan 02 (halimun/playfairDisplay, raleway, inter)
2. Add Header, Footer, WhatsAppButton imports
3. Render Header above {children}, Footer below {children}, WhatsAppButton anywhere in body (renders fixed)

```typescript
import type { Metadata } from "next";
// Font imports — read from 01-02-SUMMARY.md to know which font name was used
// (either halimun or playfairDisplay — use whichever Plan 02 chose)
import { halimun, raleway, inter } from "@/lib/fonts";
// OR: import { playfairDisplay, raleway, inter } from "@/lib/fonts";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Twinkle Locs",
  description: "Premium loc bead accessories for your loc journey",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${halimun.variable} ${raleway.variable} ${inter.variable}`}
      // OR: className={`${playfairDisplay.variable} ${raleway.variable} ${inter.variable}`}
    >
      <body className="font-body bg-cream text-charcoal antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
```

Update `src/app/page.tsx` to a simple hero placeholder that looks reasonable under the header:

```typescript
export default function HomePage() {
  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 py-16 bg-cream">
      <h1 className="font-display text-5xl md:text-6xl text-cocoa text-center leading-tight">
        Twinkle Locs
      </h1>
      <p className="font-heading text-xl text-charcoal/70 text-center max-w-lg">
        Premium loc bead accessories — crafted for your loc journey
      </p>
      <a
        href="/catalog"
        className="bg-gold text-cocoa font-heading font-semibold px-8 py-4 rounded-lg hover:bg-terracotta hover:text-cream transition-colors"
      >
        Shop the Collection
      </a>
    </section>
  );
}
```

Commit:

```bash
git add src/components/ src/app/layout.tsx src/app/page.tsx
git commit -m "feat(01): add header, footer, mobile drawer, and WhatsApp button"
```
  </action>
  <verify>
```bash
npm run dev
```

Then open http://localhost:3000 and perform the manual checks listed in the checkpoint below.
  </verify>
  <done>
Header and Footer render on the homepage. WhatsApp button is visible in bottom-right corner. Root layout imports and renders all four components. TypeScript check passes. Build passes.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Header with desktop nav and hamburger, mobile drawer with slide animation, footer with brand/links/connect columns, and a fixed green WhatsApp floating button — all wired into root layout and appearing on every page.
  </what-built>
  <how-to-verify>
Open http://localhost:3000 in a browser and check the following:

**Desktop (window wider than 768px):**
1. Header is visible at top with "Twinkle Locs" logo and nav links (Shop, About, Blog, FAQ, Shipping)
2. Footer is visible at bottom with brand name in gold, navigation column, and connect column
3. Green WhatsApp button is visible in bottom-right corner
4. Clicking WhatsApp button opens a new tab to wa.me

**Mobile (resize window to 375px width or use DevTools device emulation):**
5. Desktop nav links are hidden — only the hamburger icon (three lines) is visible
6. Tap/click the hamburger icon — drawer slides in from the left
7. Drawer contains: "Twinkle Locs" title, close X button, nav links (Shop, About, Blog, FAQ, Shipping, Cart)
8. Tap/click the backdrop (dark overlay) — drawer closes
9. Tap/click the X button — drawer closes
10. Press Escape key — drawer closes
11. WhatsApp button is still visible over the drawer backdrop

**Both viewports:**
12. Background is warm cream (not white)
13. Text uses cocoa/charcoal colors
14. "Twinkle Locs" logo uses the display font (different from nav links)
  </how-to-verify>
  <resume-signal>
Type "approved" if all checks pass. Describe any issues if something is wrong so they can be fixed before continuing.
  </resume-signal>
</task>

</tasks>

<verification>
After checkpoint approval:

1. `npm run build` — exits 0, no errors
2. Commit the final state:
```bash
git add -A
git commit -m "feat(01): Phase 1 foundation complete — layout, middleware, design tokens"
```
</verification>

<success_criteria>
- Header visible on all pages with desktop nav and mobile hamburger
- Mobile drawer slides in/out from left with backdrop
- Drawer closes on backdrop tap, X button, and Escape key
- Footer visible on all pages with navigation links and brand info
- WhatsApp floating button visible on every page (bottom-right)
- WhatsApp button opens wa.me/[number] in new tab
- Root layout wraps all content with Header + Footer + WhatsApp button
- All components use design token classes (bg-cream, text-cocoa, font-display, font-heading, font-body)
- Build passes with zero errors
</success_criteria>

<output>
After completion, create `/Users/mac/Documents/GitHub/twinkle/.planning/phases/01-foundation/01-04-SUMMARY.md`
</output>
