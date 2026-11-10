import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { sql } from 'drizzle-orm'
import { db, user as userTable } from '@/db'
import { adminEmailAllowlist } from './admins'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  // Sign-up is the only way to create an account, and every account is an admin.
  // So: allow it only for the very first account (first-run setup), or for an
  // address listed in ADMIN_EMAILS. Everyone else is refused.
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          const allow = adminEmailAllowlist()
          if (allow.size > 0 && allow.has(newUser.email.toLowerCase())) return { data: newUser }
          const [{ count }] = await db
            .select({ count: sql<number>`count(*)`.mapWith(Number) })
            .from(userTable)
          if (count === 0) return { data: newUser }
          throw new APIError('FORBIDDEN', { message: 'Sign-up is closed. Ask the store owner for access.' })
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 days
    updateAge: 60 * 60 * 24,       // refresh every 24h
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [
    'https://www.twinklelocs.com',
    'https://twinklelocs.com',
  ],
  advanced: {
    cookiePrefix: 'twinkle',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
})

export type Session = typeof auth.$Infer.Session
