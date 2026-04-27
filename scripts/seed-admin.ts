/**
 * Seed the initial admin user in Neon via better-auth.
 *
 * tsx does NOT auto-load .env.local — pass vars explicitly:
 *   DATABASE_URL='...' BETTER_AUTH_SECRET='...' BETTER_AUTH_URL=http://localhost:3000 \
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret \
 *   node_modules/.bin/tsx scripts/seed-admin.ts
 */
import { auth } from '@/lib/auth'

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME ?? 'Admin'
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in env')
    process.exit(1)
  }
  const result = await auth.api.signUpEmail({
    body: { email, password, name },
  })
  console.log('Seeded admin user:', result.user.id, result.user.email)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
