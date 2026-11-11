'use client'

import Link from 'next/link'
import { BUSINESS } from '@/lib/config/business'

/**
 * Branded "something went wrong" screen, styled like the 404 page. Used by the
 * route error boundaries (error.tsx) so a database or network hiccup shows a
 * way forward (try again, or order on WhatsApp) instead of Next's bare
 * "Application error" screen.
 */
export function ErrorState({
  title,
  message,
  onRetry,
  whatsappMessage = 'Hi, the website had a problem loading. Can you help me order?',
  digest,
}: {
  title: string
  message: string
  onRetry?: () => void
  whatsappMessage?: string
  /** Next's error digest, shown small so a screenshot helps us find it in the logs */
  digest?: string
}) {
  return (
    <div className="relative overflow-hidden bg-forest">
      {/* Streaming serves this with status 200, so tell search engines not to index it in place of the real page */}
      <meta name="robots" content="noindex" />
      <div aria-hidden="true" className="absolute inset-0 bg-pattern-01 opacity-[0.06]" />
      <div role="alert" className="relative mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-gold-light">Something went wrong</p>
        <h1 className="mt-8 font-display text-5xl leading-[1.2] text-cream md:text-6xl">{title}</h1>
        <p className="mt-4 font-body text-cream/80">{message}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-12 items-center rounded-lg bg-gold-light px-7 font-heading font-semibold text-forest hover:bg-cream transition-colors"
            >
              Try again
            </button>
          )}
          <a
            href={BUSINESS.whatsapp.url(whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center rounded-lg px-7 font-heading font-semibold text-cream ring-1 ring-cream/40 hover:bg-cream/10 transition-colors"
          >
            Order on WhatsApp
          </a>
        </div>
        <Link href="/" className="mt-6 font-body text-sm text-cream/75 underline underline-offset-4 hover:text-cream">
          Back to home
        </Link>
        {digest && <p className="mt-8 font-body text-xs text-cream/40">Reference: {digest}</p>}
      </div>
    </div>
  )
}
