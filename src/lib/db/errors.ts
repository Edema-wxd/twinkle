/**
 * Postgres error codes, wherever they sit. drizzle-orm (0.44+) wraps database
 * errors in DrizzleQueryError and puts the driver's error (with `.code`) on
 * `.cause`, so checking `err.code` directly never matches.
 */
export function pgErrorCode(err: unknown): string | undefined {
  let e: unknown = err
  for (let depth = 0; e && depth < 5; depth++) {
    const code = (e as { code?: unknown }).code
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code
    e = (e as { cause?: unknown }).cause
  }
  return undefined
}

/** A UNIQUE constraint was hit (e.g. a slug, email or code that already exists). */
export function isUniqueViolation(err: unknown): boolean {
  return pgErrorCode(err) === '23505'
}
