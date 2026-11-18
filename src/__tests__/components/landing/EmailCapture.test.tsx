// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }))
vi.mock('@/lib/tracking/events', () => ({ trackEvent }))

import { EmailCapture, SIGNED_UP_KEY } from '@/components/landing/EmailCapture'

const offerOn = { enabled: true, percent: 10, minOrder: 100_000 }
const fetchMock = vi.fn()
const reply = (status: number, body: unknown) => fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body })

async function fillAndSend(cta = 'Send my code') {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('First name'), 'Adaeze')
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.click(screen.getByRole('button', { name: cta }))
  return user
}

beforeEach(() => {
  fetchMock.mockReset()
  trackEvent.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  localStorage.clear()
})
afterEach(() => vi.unstubAllGlobals())

describe('EmailCapture', () => {
  it('states the offer terms, with visible labels', () => {
    render(<EmailCapture offer={offerOn} tone="dark" />)
    expect(screen.getByRole('heading', { name: 'Get 10% off your first order of ₦100,000 or more' })).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toHaveAttribute('autocomplete', 'given-name')
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
  })

  it('leaves the minimum out when there is none', () => {
    render(<EmailCapture offer={{ ...offerOn, minOrder: 0 }} tone="dark" />)
    expect(screen.getByRole('heading', { name: 'Get 10% off your first order' })).toBeInTheDocument()
  })

  it('posts the welcome offer signup and shows the code from the response, its expiry and minimum', async () => {
    const expiresAt = new Date(Date.now() + 6 * 3_600_000).toISOString()
    reply(201, { ok: true, pending: true, offer: { code: 'TWINKLE-7QX2', percent: 10, expiresAt, minOrder: 100_000 } })
    render(<EmailCapture offer={offerOn} tone="dark" />)
    await fillAndSend()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/newsletter/subscribe')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ first_name: 'Adaeze', email: 'ada@example.com', source_page: 'lp', offer: 'welcome', website: '' })
    expect(typeof body.elapsed_ms).toBe('number')

    expect(await screen.findByText('TWINKLE-7QX2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    expect(screen.getByText(/10% off your first order of ₦100,000 or more\. Valid for 6 hours, until .+ \(Lagos time\)\./)).toBeInTheDocument()
    expect(screen.getByText("We've emailed it to you too. Use it at checkout.")).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith({ name: 'Lead', source: 'lp' })
    expect(localStorage.getItem(SIGNED_UP_KEY)).toBe('1')
  })

  it('copies the code', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    reply(201, { ok: true, offer: { code: 'TWINKLE-7QX2', percent: 10, expiresAt: new Date(Date.now() + 3_600_000).toISOString(), minOrder: 0 } })
    render(<EmailCapture offer={offerOn} tone="light" />)
    const user = await fillAndSend()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await user.click(await screen.findByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith('TWINKLE-7QX2')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('explains a 409 (already on the list) without losing what was typed', async () => {
    reply(409, { error: 'already subscribed' })
    render(<EmailCapture offer={offerOn} tone="dark" />)
    await fillAndSend()
    expect(await screen.findByText(/This email is already on our list/)).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('points at the email field when the server rejects the address', async () => {
    reply(400, { error: 'A valid email address is required' })
    render(<EmailCapture offer={offerOn} tone="dark" />)
    await fillAndSend()
    expect(await screen.findByText('Please enter a valid email address, like name@example.com.')).toBeInTheDocument()
  })

  it('says so when the server fails or the connection drops, and lets them try again', async () => {
    reply(500, { error: 'boom' })
    render(<EmailCapture offer={offerOn} tone="dark" />)
    const user = await fillAndSend()
    expect(await screen.findByText(/Something went wrong on our side/)).toBeInTheDocument()

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await user.click(screen.getByRole('button', { name: 'Send my code' }))
    expect(await screen.findByText(/couldn’t reach our server/)).toBeInTheDocument()
  })

  it('asks them to confirm by email when the response has no code', async () => {
    reply(201, { ok: true, pending: true })
    render(<EmailCapture offer={offerOn} tone="dark" />)
    await fillAndSend()
    expect(await screen.findByText('Almost there!')).toBeInTheDocument()
  })

  it('is a plain newsletter signup when the offer is off', async () => {
    reply(201, { ok: true, pending: true })
    render(<EmailCapture offer={{ ...offerOn, enabled: false }} tone="dark" />)
    expect(screen.getByRole('heading', { name: 'Get Twinkle news' })).toBeInTheDocument()
    await fillAndSend('Sign me up')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('offer')
    expect(await screen.findByText('Almost there!')).toBeInTheDocument()
  })
})
