import { createHmac, timingSafeEqual } from 'node:crypto'
import { BUSINESS } from '@/lib/config/business'

/**
 * Signed, per-subscriber unsubscribe links. The token is an HMAC of the email,
 * so a link only works for the address it was made for (nobody can unsubscribe
 * someone else by editing the URL), and no extra database column is needed.
 */

function secret(): string {
  const s = process.env.NEWSLETTER_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim()
  if (!s) throw new Error('Unsubscribe links need NEWSLETTER_SECRET or BETTER_AUTH_SECRET to be set')
  return s
}

const normalise = (email: string) => email.trim().toLowerCase()

export function unsubscribeToken(email: string): string {
  // Domain-separated so this can never be confused with any other use of the secret
  return createHmac('sha256', secret()).update(`newsletter-unsubscribe:${normalise(email)}`).digest('base64url')
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false
  const expected = Buffer.from(unsubscribeToken(email))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')
}

function query(email: string): string {
  return new URLSearchParams({ e: normalise(email), t: unsubscribeToken(email) }).toString()
}

/** The page link shown in the email footer (asks the reader to confirm). */
export function unsubscribeUrl(email: string): string {
  return `${siteUrl()}/unsubscribe?${query(email)}`
}

/**
 * List-Unsubscribe headers (RFC 2369 + RFC 8058 one-click). Gmail and Yahoo show
 * their own "Unsubscribe" button from these and POST to the https URL.
 */
export function unsubscribeHeaders(email: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${siteUrl()}/api/newsletter/unsubscribe?${query(email)}>, <mailto:${BUSINESS.support.email}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}
