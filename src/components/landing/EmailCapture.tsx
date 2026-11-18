'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { LandingConfig } from '@/lib/landing/config'
import { codeValidity, welcomeOfferHeadline } from '@/lib/landing/offerCopy'
import { formatNaira } from '@/lib/landing/selection'
import type { SubscribeResponse, WelcomeOfferCode } from '@/lib/landing/welcomeOffer'
import { trackEvent } from '@/lib/tracking/events'
import { CheckIcon, CopyIcon } from './icons'

/** Set once someone has signed up here, so the welcome pop-up never asks again */
export const SIGNED_UP_KEY = 'tl_lp_signed_up'

type Offer = Pick<LandingConfig['welcomeOffer'], 'enabled' | 'percent' | 'minOrder'>

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'code'; offer: WelcomeOfferCode }
  | { status: 'pending' }
  | { status: 'error'; message: string; field?: 'name' | 'email' }

type Props = {
  offer: Offer
  /** Colours for the surface it sits on: the forest final CTA band, or the cream pop-up */
  tone: 'dark' | 'light'
  /** The heading's tag (h2 when it titles the pop-up) and id (for aria-labelledby) */
  headingAs?: 'h2' | 'h3'
  headingId?: string
}

/**
 * "Get 10% off your first order": first name + email, posted to the newsletter
 * endpoint with offer: 'welcome' and source_page: 'lp'. The response carries this
 * visitor's own one-use code, shown here big with a Copy button (and emailed).
 * With the offer off it's a plain newsletter signup. Same bot checks as the footer form.
 */
export function EmailCapture({ offer, tone, headingAs: Heading = 'h3', headingId }: Props) {
  const id = useId()
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [state, setState] = useState<State>({ status: 'idle' })
  const openedAt = useRef(Date.now())
  const resultRef = useRef<HTMLDivElement>(null)
  const dark = tone === 'dark'

  useEffect(() => {
    if (state.status === 'code' || state.status === 'pending') resultRef.current?.focus()
  }, [state.status])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          email,
          source_page: 'lp',
          ...(offer.enabled ? { offer: 'welcome' } : {}),
          website,
          elapsed_ms: Date.now() - openedAt.current,
        }),
      })
      const data: SubscribeResponse = await res.json().catch(() => ({}))
      if (res.ok) {
        trackEvent({ name: 'Lead', source: 'lp' })
        try {
          localStorage.setItem(SIGNED_UP_KEY, '1')
        } catch {
          // storage blocked: the pop-up may ask again, nothing worse
        }
        setState(data.offer?.code ? { status: 'code', offer: data.offer } : { status: 'pending' })
        return
      }
      setState(errorFor(res.status, data.error, offer.enabled))
    } catch {
      setState({ status: 'error', message: 'We couldn’t reach our server. Check your connection and try again.' })
    }
  }

  const headline = welcomeOfferHeadline(offer)
  const label = `mb-1.5 block font-heading text-sm font-semibold ${dark ? 'text-cream' : 'text-forest'}`
  const input = `block w-full min-h-12 rounded-xl px-4 font-body text-base outline-none transition-shadow focus-visible:ring-2 aria-[invalid=true]:ring-2 ${
    dark
      ? 'bg-cream text-charcoal placeholder:text-charcoal/50 ring-1 ring-cream/30 focus-visible:ring-gold-light aria-[invalid=true]:ring-red-300'
      : 'bg-white text-charcoal placeholder:text-charcoal/50 ring-1 ring-forest/25 focus-visible:ring-forest aria-[invalid=true]:ring-red-700'
  }`
  const errorText = dark ? 'text-red-200' : 'text-red-800'

  if (state.status === 'code' || state.status === 'pending') {
    return (
      <div ref={resultRef} tabIndex={-1} role="status" className="outline-none">
        {state.status === 'code' ? (
          <CodeResult offer={state.offer} dark={dark} headingId={headingId} Heading={Heading} />
        ) : (
          <>
            <Heading id={headingId} className={`font-heading text-xl font-bold ${dark ? 'text-cream' : 'text-forest'}`}>
              Almost there!
            </Heading>
            <p className={`mt-2 font-body text-base ${dark ? 'text-cream/85' : 'text-charcoal/80'}`}>
              Check your inbox and tap the link we sent to confirm. (Not there? Look in Spam or Promotions.)
            </p>
          </>
        )}
      </div>
    )
  }

  const err = state.status === 'error' ? state : null
  const busy = state.status === 'loading'

  return (
    <div>
      <Heading id={headingId} className={`font-heading text-xl font-bold leading-snug md:text-2xl ${dark ? 'text-cream' : 'text-forest'}`}>
        {headline}
      </Heading>
      <p className={`mt-1.5 font-body text-base ${dark ? 'text-cream/85' : 'text-charcoal/80'}`}>
        {offer.enabled ? 'Pop in your name and email and we’ll send your code straight away.' : 'New styles and restocks, now and then. No spam.'}
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
        {/* Honeypot: off-screen, skipped by keyboard and screen readers; only bots fill it in */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor={`${id}-website`}>Website</label>
          <input id={`${id}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-name`} className={label}>
            First name
          </label>
          <input
            id={`${id}-name`}
            type="text"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            aria-invalid={err?.field === 'name' || undefined}
            aria-describedby={err?.field === 'name' ? `${id}-error` : undefined}
            className={input}
          />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={label}>
            Email
          </label>
          <input
            id={`${id}-email`}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={err?.field === 'email' || undefined}
            aria-describedby={err?.field === 'email' ? `${id}-error` : undefined}
            className={input}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className={`min-h-12 rounded-xl bg-gold-light px-6 font-heading text-base font-bold text-forest shadow-sm transition-colors hover:bg-[#D8BC86] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 sm:col-span-2 ${
            dark ? 'focus-visible:outline-cream' : 'focus-visible:outline-forest'
          }`}
        >
          {busy ? 'Sending…' : offer.enabled ? 'Send my code' : 'Sign me up'}
        </button>
        <div aria-live="assertive" className="sm:col-span-2">
          {err && (
            <p id={`${id}-error`} className={`font-body text-sm font-semibold ${errorText}`}>
              {err.message}
            </p>
          )}
        </div>
      </form>
      <p className={`mt-3 font-body text-[13px] ${dark ? 'text-cream/75' : 'text-charcoal/70'}`}>
        How we use your email:{' '}
        <a href="/privacy" className="underline underline-offset-2">
          Privacy policy
        </a>
      </p>
    </div>
  )
}

function errorFor(status: number, serverError: string | undefined, offer: boolean): Extract<State, { status: 'error' }> {
  const msg = (serverError ?? '').toLowerCase()
  if (status === 409) {
    return {
      status: 'error',
      field: 'email',
      message: offer
        ? 'This email is already on our list. If you signed up for a code before, it’s in that email (check Spam or Promotions too).'
        : 'This email is already on our list. Thank you for being here!',
    }
  }
  if (status === 400 && msg.includes('email')) return { status: 'error', field: 'email', message: 'Please enter a valid email address, like name@example.com.' }
  if (status === 400 && msg.includes('name')) return { status: 'error', field: 'name', message: 'Please enter your first name.' }
  if (status === 429) return { status: 'error', message: 'Too many tries. Please wait a minute and try again.' }
  return { status: 'error', message: 'Something went wrong on our side. Please try again in a moment.' }
}

function CodeResult({
  offer,
  dark,
  headingId,
  Heading,
}: {
  offer: WelcomeOfferCode
  dark: boolean
  headingId?: string
  Heading: 'h2' | 'h3'
}) {
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLParagraphElement>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(offer.code)
    } catch {
      // Older in-app browsers: select the code so a long-press copies it
      const range = document.createRange()
      if (codeRef.current) range.selectNodeContents(codeRef.current)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const muted = dark ? 'text-cream/85' : 'text-charcoal/80'
  return (
    <div>
      <Heading id={headingId} className={`font-heading text-xl font-bold ${dark ? 'text-cream' : 'text-forest'}`}>
        Your {offer.percent}% off code
      </Heading>
      <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-2xl p-4 ${dark ? 'bg-cream/10 ring-1 ring-cream/25' : 'bg-white ring-1 ring-forest/15'}`}>
        <p ref={codeRef} className={`select-all break-all font-heading text-3xl font-bold tracking-[0.12em] md:text-4xl ${dark ? 'text-cream' : 'text-forest'}`}>
          {offer.code}
        </p>
        <button
          type="button"
          onClick={copy}
          className={`ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold-light px-4 font-heading text-sm font-bold text-forest hover:bg-[#D8BC86] focus-visible:outline-2 focus-visible:outline-offset-2 ${
            dark ? 'focus-visible:outline-cream' : 'focus-visible:outline-forest'
          }`}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className={`mt-3 font-body text-base ${muted}`}>
        {offer.percent}% off your first order{offer.minOrder > 0 ? ` of ${formatNaira(offer.minOrder)} or more` : ''}. {codeValidity(offer.expiresAt)}
      </p>
      <p className={`mt-1 font-body text-base font-semibold ${dark ? 'text-cream' : 'text-forest'}`}>We&apos;ve emailed it to you too. Use it at checkout.</p>
    </div>
  )
}
