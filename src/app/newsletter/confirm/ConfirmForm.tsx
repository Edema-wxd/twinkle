'use client'

import { useState } from 'react'
import Link from 'next/link'

type State = 'idle' | 'working' | 'done' | 'error'

/** A button press (not just opening the link) confirms, because email scanners open links too. */
export function ConfirmForm({ email, token }: { email: string; token: string }) {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  if (!email || !token) {
    return (
      <p className="mt-6 font-body text-charcoal/80">
        This link is incomplete. Open it straight from the confirmation email, or join again from the bottom of any page.
      </p>
    )
  }

  async function confirm() {
    setState('working')
    try {
      const res = await fetch('/api/newsletter/confirm', {
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
          <p className="font-heading text-lg font-semibold text-forest">You&apos;re in, welcome to the Twinkle family!</p>
          <p className="mt-2">
            We&apos;ll send new drops, loc care guides and the occasional offer to <strong className="text-charcoal">{email}</strong>. Every email has an
            unsubscribe link.
          </p>
          <p className="mt-6">
            <Link href="/">Browse the beads</Link>
          </p>
        </>
      ) : (
        <>
          <p>
            Confirm you want the Twinkle Locs newsletter at <strong className="text-charcoal">{email}</strong>?
          </p>
          <button
            type="button"
            onClick={confirm}
            disabled={state === 'working'}
            className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-forest px-6 font-heading text-sm font-semibold text-cream hover:bg-forest/90 disabled:opacity-60"
          >
            {state === 'working' ? 'Confirming…' : 'Yes, sign me up'}
          </button>
          {state === 'error' && (
            <p role="alert" className="mt-4 text-red-700">
              {message}
            </p>
          )}
        </>
      )}
    </div>
  )
}
