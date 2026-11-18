// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PromoCodesManager, type PromoCode } from '@/app/(admin)/_components/PromoCodesManager'

const base: PromoCode = {
  id: 'p1',
  code: 'FREESHIP',
  discountType: 'free_shipping',
  discountValue: 0,
  maxUses: null,
  currentUses: 0,
  minOrder: null,
  expiresAt: null,
  isActive: true,
  source: null,
  issuedToEmail: null,
  createdAt: '2026-10-01T10:00:00.000Z',
}

const welcomeCodes: PromoCode[] = [
  { ...base, id: 'w2', code: 'WELCOME-NEW2', discountType: 'percentage', discountValue: 10, maxUses: 1, minOrder: 100_000, source: 'welcome', issuedToEmail: 'chi@example.com' },
  { ...base, id: 'w1', code: 'WELCOME-OLD1', discountType: 'percentage', discountValue: 10, maxUses: 1, currentUses: 1, minOrder: 100_000, source: 'welcome', issuedToEmail: 'ada@example.com' },
]

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('PromoCodesManager', () => {
  it('shows the codes made in Admin with their minimum order', () => {
    render(
      <PromoCodesManager
        initialCodes={[base, { ...base, id: 'p2', code: 'BIG10', discountType: 'percentage', discountValue: 10, minOrder: 50_000 }]}
        welcomeSummary={{ issued: 0, used: 0 }}
      />,
    )
    const big = screen.getByText('BIG10').closest('tr')!
    expect(within(big).getByText('₦50,000')).toBeInTheDocument()
    expect(within(screen.getByText('FREESHIP').closest('tr')!).getByText('None')).toBeInTheDocument()
  })

  it('summarises welcome codes and only loads them when asked', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ codes: welcomeCodes }), { status: 200 }))
    render(<PromoCodesManager initialCodes={[base]} welcomeSummary={{ issued: 2, used: 1 }} />)

    expect(screen.getByTestId('welcome-summary')).toHaveTextContent('2 welcome codes issued by the landing page, 1 used.')
    expect(screen.queryByText('chi@example.com')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Show welcome codes' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/promo-codes?source=welcome')
    expect(await screen.findByText('chi@example.com')).toBeInTheDocument()
    const used = screen.getByText('WELCOME-OLD1').closest('tr')!
    expect(within(used).getByText('ada@example.com')).toBeInTheDocument()
    expect(within(used).getByText('Used')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Hide welcome codes' }))
    expect(screen.queryByText('chi@example.com')).not.toBeInTheDocument()
  })

  it('has no toggle when no welcome codes were issued', () => {
    render(<PromoCodesManager initialCodes={[base]} welcomeSummary={{ issued: 0, used: 0 }} />)
    expect(screen.getByTestId('welcome-summary')).toHaveTextContent('0 welcome codes issued by the landing page, 0 used.')
    expect(screen.queryByRole('button', { name: 'Show welcome codes' })).not.toBeInTheDocument()
  })

  it('sends the minimum order when creating a code', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: { ...base, id: 'n1', code: 'BIG', minOrder: 75_000 } }), { status: 201 }))
    render(<PromoCodesManager initialCodes={[]} welcomeSummary={{ issued: 0, used: 0 }} />)
    await userEvent.type(screen.getByLabelText('Code *'), 'big')
    await userEvent.type(screen.getByLabelText('Minimum order ₦ (blank = none)'), '75000')
    await userEvent.click(screen.getByRole('button', { name: 'Create Code' }))
    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toMatchObject({ code: 'BIG', minOrder: 75000 })
    expect(await screen.findByText('₦75,000')).toBeInTheDocument()
  })

  it('edits the minimum order of an existing code, sending only what changed', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: { ...base, minOrder: 20_000 } }), { status: 200 }))
    render(<PromoCodesManager initialCodes={[{ ...base, expiresAt: '2026-12-31T15:30:00.000Z' }]} welcomeSummary={{ issued: 0, used: 0 }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.type(screen.getByLabelText('Minimum order in naira'), '20000')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/promo-codes')
    expect(JSON.parse(init.body)).toEqual({ id: 'p1', minOrder: 20000 })
    expect(await screen.findByText('₦20,000')).toBeInTheDocument()
  })
})
