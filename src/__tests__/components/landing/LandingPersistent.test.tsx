// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'

const h = vi.hoisted(() => ({ consent: 'pending' as 'pending' | 'granted' | 'denied', drawerOpen: false, trackEvent: vi.fn() }))
vi.mock('@/lib/tracking/consent', () => ({ useConsentStatus: () => h.consent }))
vi.mock('@/lib/tracking/events', () => ({ trackEvent: h.trackEvent }))
vi.mock('@/lib/cart/CartContext', () => ({ useCart: () => ({ state: { items: [], isDrawerOpen: h.drawerOpen, hydrated: true }, dispatch: vi.fn() }) }))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

import { LandingPersistent } from '@/components/landing/LandingPersistent'
import { DEFAULT_LANDING_CONFIG } from '@/lib/landing/config'

// IntersectionObserver stand-in: tests say what is on screen
let observers: { cb: IntersectionObserverCallback; els: Element[] }[] = []
class FakeIO {
  els: Element[] = []
  constructor(public cb: IntersectionObserverCallback) {
    observers.push(this)
  }
  observe(el: Element) {
    this.els.push(el)
  }
  unobserve() {}
  disconnect() {}
}
function onScreen(selector: string, isIntersecting: boolean, top = 0) {
  const el = document.querySelector(selector)!
  act(() => {
    for (const o of observers.filter((x) => x.els.includes(el))) {
      o.cb([{ target: el, isIntersecting, boundingClientRect: { top } } as unknown as IntersectionObserverEntry], o as unknown as IntersectionObserver)
    }
  })
}

function renderPage() {
  return render(
    <>
      <section id="lp-hero" />
      <section id="best-sellers" />
      <section id="final-cta" />
      <footer data-site-footer />
      <LandingPersistent productIds={['a', 'b']} lowestPrice={13590} thumbnail="/t.jpg" offer={DEFAULT_LANDING_CONFIG.welcomeOffer} />
    </>,
  )
}

const bar = () => screen.getByText('Twinkles from', { exact: false }).closest('[aria-hidden], .fixed')!
const fab = () => document.querySelector('a[aria-label="Chat with us on WhatsApp"]')!

beforeEach(() => {
  observers = []
  h.consent = 'pending'
  h.drawerOpen = false
  h.trackEvent.mockReset()
  vi.stubGlobal('IntersectionObserver', FakeIO)
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
})

describe('LandingPersistent', () => {
  it('fires ViewContent once with the featured product ids', () => {
    renderPage()
    expect(h.trackEvent).toHaveBeenCalledTimes(1)
    expect(h.trackEvent).toHaveBeenCalledWith({ name: 'ViewContent', contentIds: ['a', 'b'] })
  })

  it('keeps the sticky bar and WhatsApp button hidden while the cookie banner is up', () => {
    renderPage()
    onScreen('#lp-hero', false, -500)
    expect(bar()).toHaveAttribute('aria-hidden', 'true')
    expect(fab()).toHaveAttribute('aria-hidden', 'true')
  })

  it('after consent: the bar appears once the hero has gone, and steps aside for Best-sellers and the cart', () => {
    h.consent = 'granted'
    const { rerender } = renderPage()
    expect(fab()).not.toHaveAttribute('aria-hidden')
    expect(bar()).toHaveAttribute('aria-hidden', 'true') // hero still on screen

    onScreen('#lp-hero', false, -500)
    expect(bar()).not.toHaveAttribute('aria-hidden')
    expect(screen.getByText('₦13,590')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Shop now' })).toHaveAttribute('href', '#best-sellers')

    onScreen('#best-sellers', true)
    expect(bar()).toHaveAttribute('aria-hidden', 'true')
    onScreen('#best-sellers', false)
    expect(bar()).not.toHaveAttribute('aria-hidden')

    h.drawerOpen = true
    rerender(
      <>
        <section id="lp-hero" />
        <section id="best-sellers" />
        <section id="final-cta" />
        <footer data-site-footer />
        <LandingPersistent productIds={['a', 'b']} lowestPrice={13590} thumbnail="/t.jpg" offer={DEFAULT_LANDING_CONFIG.welcomeOffer} />
      </>,
    )
    expect(bar()).toHaveAttribute('aria-hidden', 'true')
    expect(fab()).toHaveAttribute('aria-hidden', 'true')
  })

  it('the WhatsApp button steps aside for the footer', () => {
    h.consent = 'denied'
    renderPage()
    onScreen('[data-site-footer]', true)
    expect(fab()).toHaveAttribute('aria-hidden', 'true')
  })
})
