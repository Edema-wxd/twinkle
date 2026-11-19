// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const nav = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))

import { Tracking } from '@/components/tracking/Tracking'
import { ConsentBanner } from '@/components/tracking/ConsentBanner'
import { ConsentChoice } from '@/components/tracking/ConsentChoice'
import { getConsent } from '@/lib/tracking/consent'
import { resetPixelsForTests } from '@/lib/tracking/pixels'

function clearCookies() {
  for (const c of document.cookie.split('; ').filter(Boolean)) {
    document.cookie = `${c.split('=')[0]}=; Path=/; Max-Age=0`
  }
}

beforeEach(() => {
  nav.pathname = '/'
  resetPixelsForTests()
  window.fbq = Object.assign(vi.fn(), {}) as unknown as Window['fbq']
})

afterEach(() => {
  clearCookies()
  vi.unstubAllEnvs()
  delete window.fbq
  delete window.ttq
})

describe('cookie banner', () => {
  it('does not appear when no pixel is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '')
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', '')
    render(<ConsentBanner />)
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).not.toBeInTheDocument()
  })

  it('appears while consent is pending, with equal Accept and Decline buttons and a Privacy link', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
    render(<ConsentBanner />)
    const banner = screen.getByRole('region', { name: 'Cookie choice' })
    expect(banner).toHaveTextContent('We use cookies from Meta and TikTok to see which of our ads work.')
    const accept = screen.getByRole('button', { name: 'Accept' })
    const decline = screen.getByRole('button', { name: 'Decline' })
    expect(accept.className).toBe(decline.className)
    expect(accept.className).toContain('min-h-11')
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy#cookies')
    // Fixed (no layout shift), above the floating buttons, below the cart drawer
    expect(banner.className).toContain('fixed')
    expect(banner.className).toContain('z-[55]')
  })

  it('records Accept, closes, and loads the pixel with a PageView', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<Tracking />)
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(getConsent()).toBe('granted')
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).not.toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(50)
    })
    expect(window.fbq).toHaveBeenCalledWith('init', '123456789012345')
    expect(window.fbq).toHaveBeenCalledWith('track', 'PageView')
    vi.useRealTimers()
  })

  it('records Decline, closes, and loads nothing', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
    render(<Tracking />)
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }))
    expect(getConsent()).toBe('denied')
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).not.toBeInTheDocument()
    expect(window.fbq).not.toHaveBeenCalled()
  })

  it('does not appear once answered', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
    document.cookie = 'tl_consent=denied; Path=/'
    render(<ConsentBanner />)
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).not.toBeInTheDocument()
  })

  it('never appears in the admin', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
    nav.pathname = '/admin/orders'
    render(<Tracking />)
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).not.toBeInTheDocument()
  })
})

describe('changing the choice on /privacy', () => {
  it('shows the current choice and lets the visitor change it', async () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '123456789012345')
    render(<ConsentChoice />)
    expect(screen.getByRole('status')).toHaveTextContent('You haven’t chosen yet')
    await userEvent.click(screen.getByRole('button', { name: 'Allow ad cookies' }))
    expect(getConsent()).toBe('granted')
    expect(screen.getByRole('status')).toHaveTextContent('You have allowed ad cookies.')
    expect(screen.getByRole('button', { name: 'Allow ad cookies' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Decline ad cookies' }))
    expect(getConsent()).toBe('denied')
    expect(screen.getByRole('status')).toHaveTextContent('You have declined ad cookies.')
  })

  it('says there is nothing to choose when no pixel is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '')
    vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', '')
    render(<ConsentChoice />)
    expect(screen.getByText(/switched off on this shop/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
