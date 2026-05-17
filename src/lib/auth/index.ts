import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/db'

const isProd = process.env.NODE_ENV === 'production'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24,   // 24 hours — hard expiry from login
    updateAge: 60 * 60 * 24,   // equal to expiresIn → session never auto-extends
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [
    'https://www.twinklelocs.com',
    'https://twinklelocs.com',
    ...(!isProd ? ['http://localhost:3000', 'http://localhost:3001'] : []),
  ],
  advanced: {
    cookiePrefix: 'twinkle',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
    },
  },
})

export type Session = typeof auth.$Infer.Session
