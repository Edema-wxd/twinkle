// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/uploadthing', () => ({ uploadFiles: vi.fn() }))

import { LandingPageForm } from '@/app/(admin)/_components/LandingPageForm'
import { DEFAULT_LANDING_CONFIG, type LandingConfig } from '@/lib/landing/config'
import type { LandingProductOption } from '@/app/(admin)/_lib/landing-form'

const products: LandingProductOption[] = [
  { slug: 'gold-twinkles', name: 'Gold Twinkles', material: 'Gold', variants: [{ name: '4mm', packs: [50, 100] }, { name: '6mm', packs: [50] }] },
  { slug: 'silver-twinkles', name: 'Silver Twinkles', material: 'Silver', variants: [{ name: '4mm', packs: [50] }] },
]

/** The defaults with every "[confirm" placeholder signed off, plus any changes */
function config(patch: Partial<LandingConfig> = {}): LandingConfig {
  const c = structuredClone(DEFAULT_LANDING_CONFIG)
  c.featured = c.featured.map((f) => ({ ...f, tagline: f.tagline.replace(/\[confirm[^\]]*\]\s*/g, '') }))
  c.sizeGuide.betweenSizesLine = 'Between sizes? Go one size up.'
  return { ...c, ...patch }
}

function renderForm(initialConfig: LandingConfig = config(), extra: { faqSignOffCount?: number } = {}) {
  return render(
    <LandingPageForm
      initialConfig={initialConfig}
      products={products}
      autoAnnouncementText="Free Lagos delivery on orders over ₦100,000 · Nationwide in 3 to 5 business days"
      freeLagosOver={100_000}
      reviewStats={{ photoReviews: 1, totalReviews: 4 }}
      faqSignOffCount={extra.faqSignOffCount ?? 0}
      siteUrl="https://twinklelocs.com"
      faqPanel={<section id="landing-faqs">FAQ panel</section>}
    />,
  )
}

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('LandingPageForm', () => {
  it('counts and highlights the fields still waiting for sign-off', () => {
    renderForm(config({ returnsLine: 'Swaps within [confirm] days', featured: [{ slug: 'gold-twinkles', tagline: '[confirm] Warm gold', fallback: { size: null, pack: null, thread: null } }] }), {
      faqSignOffCount: 2,
    })
    expect(screen.getByText('4 fields still need sign-off before ads run')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Returns line' })).toHaveAttribute('href', '#field-returnsLine')
    expect(screen.getByRole('link', { name: '2 FAQ answers' })).toHaveAttribute('href', '#landing-faqs')

    const returns = screen.getByLabelText('Returns line')
    expect(returns.className).toContain('ring-amber-400')
    expect(screen.getAllByText('Needs sign-off before ads run')).toHaveLength(2)
  })

  it('says when nothing needs sign-off', () => {
    renderForm(config())
    expect(screen.getByText(/Nothing is waiting for sign-off/)).toBeInTheDocument()
  })

  it('shows the automatic announcement when the field is empty', () => {
    renderForm()
    expect(screen.getByLabelText('Announcement text')).toHaveAttribute('placeholder', expect.stringContaining('Free Lagos delivery on orders over ₦100,000'))
  })

  it('offers only the real sizes and packs of the picked product', async () => {
    renderForm(config({ featured: [{ slug: 'gold-twinkles', tagline: 'Warm gold', fallback: { size: null, pack: null, thread: null } }] }))
    const size = screen.getByLabelText('Size')
    expect(within(size).getAllByRole('option').map((o) => o.textContent)).toEqual(['No preference', '4mm', '6mm'])
    expect(within(screen.getByLabelText('Pack')).getAllByRole('option').map((o) => o.textContent)).toEqual(['No preference', 'Pack of 50', 'Pack of 100'])

    await userEvent.selectOptions(size, '6mm')
    expect(within(screen.getByLabelText('Pack')).getAllByRole('option').map((o) => o.textContent)).toEqual(['No preference', 'Pack of 50'])
    expect(within(screen.getByLabelText('Thread colour')).getAllByRole('option')[1]).toHaveTextContent('Red')
  })

  it('checks hero version link names and shows the full link to copy', async () => {
    renderForm(config({ featured: [] }))
    await userEvent.click(screen.getByRole('button', { name: '+ Add a hero version' }))
    const key = screen.getByLabelText('Link name')

    await userEvent.type(key, 'gold-video-')
    expect(screen.getByText(/lowercase letters, numbers and hyphens only/i)).toBeInTheDocument()

    await userEvent.type(key, '1')
    expect(screen.getByText('https://twinklelocs.com/shop-twinkles/gold-video-1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '+ Add a hero version' }))
    await userEvent.type(screen.getAllByLabelText('Link name')[1], 'gold-video-1')
    expect(screen.getByText('Version 1 already uses this link name')).toBeInTheDocument()
  })

  it('will not save with problems, and says so', async () => {
    renderForm(config({ featured: [] }))
    const video = screen.getByLabelText('Video link (optional)')
    await userEvent.type(video, 'http://example.com/v.mp4')
    await userEvent.click(screen.getByRole('button', { name: 'Save landing page' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText('One field needs fixing first (marked in red).')).toBeInTheDocument()
    expect(video).toHaveAttribute('aria-invalid', 'true')
  })

  it('saves the whole config and shows the result', async () => {
    const saved = config({ featured: [], announcement: 'Hello Lagos' })
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ config: saved }), { status: 200 }))
    renderForm(config({ featured: [] }))

    await userEvent.type(screen.getByLabelText('Announcement text'), 'Hello Lagos')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save landing page' }))

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/landing-page')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toMatchObject({ announcement: 'Hello Lagos', welcomeOffer: DEFAULT_LANDING_CONFIG.welcomeOffer })
    expect(await screen.findByText('Saved. The live landing page shows these changes now.')).toBeInTheDocument()
  })

  it('shows the server error when saving fails', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Could not save the landing page. Please try again.' }), { status: 500 }))
    renderForm(config({ featured: [] }))
    await userEvent.click(screen.getByRole('button', { name: 'Save landing page' }))
    expect(await screen.findByText('Could not save the landing page. Please try again.')).toBeInTheDocument()
  })

  it('explains the welcome code minimum and free delivery', () => {
    renderForm(config({ featured: [] }))
    expect(screen.getByLabelText('Code valid for (hours)')).toHaveValue(6)
    expect(screen.getByLabelText('Minimum order (₦, items before delivery; 0 = none)')).toHaveValue(100000)
    expect(screen.getByText('Orders this size also get free Lagos delivery when it is on (Admin → Shipping).')).toBeInTheDocument()
  })
})
