'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BUSINESS } from '@/lib/config/business'

type State = 'idle' | 'working' | 'done' | 'error'

/** Confirm step: a button press (not just opening the link) unsubscribes. */
export function UnsubscribeForm({ email, token }: { email: string; token: string }) {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  const help = (
    <a href={BUSINESS.whatsapp.url('Hi, please remove me from the Twinkle Locs newsletter.')} target="_blank" rel="noopener noreferrer">
      message us on WhatsApp
    </a>
  )

  if (!email || !token) {
    return (
      <p className="mt-6 font-body text-charcoal/80 [&_a]:text-forest [&_a]:underline">
        This link is incomplete. Use the Unsubscribe link at the bottom of any of our emails, or {help} and we&apos;ll remove you.
      </p>
    )
  }

  async function unsubscribe() {
    setState('working')
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ e: email, t: token }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setMessage(data.error ?? 'Something went wrong. Please try again.')
        setState('error')
        return
      }
      setState('done')
    } catch {
      setMessage('We couldn’t reach the server. Check your connection and try again.')
      setState('error')
    }
  }

  return (
    <div role="status" aria-live="polite" className="mt-6 font-body text-charcoal/80 [&_a]:text-forest [&_a]:underline">
      {state === 'done' ? (
        <>
          <p className="font-heading text-lg font-semibold text-forest">You&apos;re unsubscribed</p>
          <p className="mt-2">
            We won&apos;t send newsletters to <strong className="text-charcoal">{email}</strong> any more. You&apos;ll still get receipts and
            delivery updates for anything you order.
          </p>
          <p className="mt-6">
            <Link href="/catalog">Back to the shop</Link>
          </p>
        </>
      ) : (
        <>
          <p>
            Stop sending the Twinkle Locs newsletter to <strong className="text-charcoal">{email}</strong>?
          </p>
          <button
            type="button"
            onClick={unsubscribe}
            disabled={state === 'working'}
            className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-forest px-6 font-heading text-sm font-semibold text-cream hover:bg-forest/90 disabled:opacity-60"
          >
            {state === 'working' ? 'Unsubscribing…' : 'Unsubscribe'}
          </button>
          {state === 'error' && (
            <p role="alert" className="mt-4 text-red-700">
              {message} You can also {help}.
            </p>
          )}
        </>
      )}
    </div>
  )
}
