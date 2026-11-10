/**
 * Optional allowlist of admin emails (comma-separated `ADMIN_EMAILS` env var).
 * When set, only these addresses can sign up or use the admin, which also locks
 * out any accounts created before sign-up was closed.
 */
export function adminEmailAllowlist(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}
