/**
 * Seed the initial admin user in Neon via better-auth.
 * Run once: `npx tsx scripts/seed-admin.ts`
 * Reads ADMIN_EMAIL + ADMIN_PASSWORD from environment.
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
