import { createHmac, randomBytes } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db, promoCodes } from '@/db'
import { isUniqueViolation } from '@/lib/db/errors'
import { WELCOME_OFFER_SOURCE, type WelcomeOfferCode } from '@/lib/landing/welcomeOffer'

/**
 * One-use welcome codes for the landing page's email capture.
 *
 * Each sign-up gets its own code (e.g. TWINKLE-7KQ2MX) instead of one shared
 * code, so a code passed around on coupon sites or WhatsApp groups works once
 * and is gone. Checkout is guest-only, so "first order only" can't be checked:
 * one use per code, and one used code per email, is the stand-in.
 *
 * Per email address (lowercased):
 * - it has a live code (active, not expired, not used): the same code again
 * - its welcome code was used: no new code, ever ('used')
 * - its code was switched off in Admin (or set to 0 uses) and never used: no
 *   new code ('revoked'). Deleting the code in Admin lets them get a fresh one.
 * - every code it had expired unused: a fresh code with a fresh window. The
 *   window is short (hours) and one use per email still holds, so someone who
 *   comes back a day later isn't turned away.
 * - otherwise: a new code
 *
 * Two requests for one email at the same moment (a double tap) get one code:
 * the first code tried is derived from the email with the app secret, so both
 * requests try the same code, the unique index on promo_codes.code lets only
 * one insert win, and the other re-reads and returns the winner's row. The
 * Neon HTTP driver has no transactions, so this is how it stays race-free.
 * Without NEWSLETTER_SECRET or BETTER_AUTH_SECRET the codes are random and a
 * double tap could, rarely, issue two codes.
 */

export const WELCOME_CODE_PREFIX = 'TWINKLE-'
/** No 0/O, 1/I/L: easy to read out and type from a phone screen */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CODE_CHARS = 6
export const WELCOME_CODE_PATTERN = new RegExp(`^${WELCOME_CODE_PREFIX}[${ALPHABET}]{${CODE_CHARS}}$`)
const MAX_ATTEMPTS = 5
const HOUR_MS = 60 * 60 * 1000

export const WELCOME_CODE_USED_MESSAGE = 'This email has already used its welcome code.'
export const WELCOME_CODE_REVOKED_MESSAGE = 'This email can’t get a welcome code. Message us on WhatsApp if you think that’s a mistake.'

export type WelcomeCodeOptions = {
  /** % off the items subtotal */
  percent: number
  /** How long a new code works for */
  expiryHours: number
  /** Smallest items subtotal (₦, before discount and delivery) the code works on; 0 = no minimum */
  minOrder: number
  now?: Date
}

export type WelcomeCodeResult =
  | { status: 'issued' | 'existing'; offer: WelcomeOfferCode }
  | { status: 'refused'; reason: 'used' | 'revoked'; message: string }

/** Six characters from the alphabet, each equally likely (bytes past the last full multiple are skipped). */
function codeFrom(bytes: Uint8Array): string | null {
  const limit = 256 - (256 % ALPHABET.length)
  let out = ''
  for (const b of bytes) {
    if (b >= limit) continue
    out += ALPHABET[b % ALPHABET.length]
    if (out.length === CODE_CHARS) return WELCOME_CODE_PREFIX + out
  }
  return null
}

function secret(): string | null {
  return process.env.NEWSLETTER_SECRET?.trim() || process.env.BETTER_AUTH_SECRET?.trim() || null
}

/** The first code tried for an email's nth welcome code: the same for simultaneous requests, unguessable without the secret. */
export function candidateWelcomeCode(email: string, n: number): string | null {
  const s = secret()
  if (!s) return null
  return codeFrom(createHmac('sha256', s).update(`welcome-code:${email.trim().toLowerCase()}:${n}`).digest())
}

export function randomWelcomeCode(): string {
  for (;;) {
    const code = codeFrom(randomBytes(32))
    if (code) return code
  }
}

const whole = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)))

type Row = {
  code: string
  discountValue: number
  minOrder: number | null
  expiresAt: Date | null
}

function toOffer(row: Row, fallbackExpiry: Date): WelcomeOfferCode {
  return {
    code: row.code,
    percent: row.discountValue,
    // A code someone removed the expiry from in Admin works at least this long
    expiresAt: (row.expiresAt ?? fallbackExpiry).toISOString(),
    minOrder: row.minOrder && row.minOrder > 0 ? row.minOrder : 0,
  }
}

/**
 * Give this email its welcome code (see the rules above). Throws on database
 * errors; the caller decides what to tell the visitor.
 */
export async function issueWelcomeCode(email: string, opts: WelcomeCodeOptions): Promise<WelcomeCodeResult> {
  const to = email.trim().toLowerCase()
  const now = opts.now ?? new Date()
  const percent = whole(opts.percent, 1, 100)
  const expiresAt = new Date(now.getTime() + whole(opts.expiryHours, 1, 24 * 365) * HOUR_MS)
  const minOrder = whole(opts.minOrder, 0, 100_000_000)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rows = await db
      .select({
        code: promoCodes.code,
        discountValue: promoCodes.discountValue,
        minOrder: promoCodes.minOrder,
        expiresAt: promoCodes.expiresAt,
        isActive: promoCodes.isActive,
        maxUses: promoCodes.maxUses,
        currentUses: promoCodes.currentUses,
      })
      .from(promoCodes)
      .where(and(eq(promoCodes.source, WELCOME_OFFER_SOURCE), eq(promoCodes.issuedToEmail, to)))
      .orderBy(desc(promoCodes.createdAt))

    if (rows.some((r) => r.currentUses > 0)) return { status: 'refused', reason: 'used', message: WELCOME_CODE_USED_MESSAGE }
    if (rows.some((r) => !r.isActive || (r.maxUses !== null && r.maxUses <= 0))) {
      return { status: 'refused', reason: 'revoked', message: WELCOME_CODE_REVOKED_MESSAGE }
    }
    const live = rows.find((r) => !r.expiresAt || r.expiresAt > now)
    if (live) return { status: 'existing', offer: toOffer(live, expiresAt) }

    // First try the code derived from the email (see above); after a clash, a random one
    const code = (attempt === 0 && candidateWelcomeCode(to, rows.length)) || randomWelcomeCode()
    try {
      const [row] = await db
        .insert(promoCodes)
        .values({
          code,
          discountType: 'percentage',
          discountValue: percent,
          maxUses: 1,
          minOrder: minOrder > 0 ? minOrder : null,
          expiresAt,
          source: WELCOME_OFFER_SOURCE,
          issuedToEmail: to,
        })
        .returning({ code: promoCodes.code, discountValue: promoCodes.discountValue, minOrder: promoCodes.minOrder, expiresAt: promoCodes.expiresAt })
      return { status: 'issued', offer: toOffer(row, expiresAt) }
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      // Taken: by a simultaneous request for this email (the next pass finds it), or rarely by another code
    }
  }
  throw new Error('Could not find a free welcome code')
}
