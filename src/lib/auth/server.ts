import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './index'
import { adminEmailAllowlist } from './admins'

export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const allow = adminEmailAllowlist()
  if (allow.size > 0 && !allow.has(session.user.email.toLowerCase())) return null
  return session
}

export async function requireAdminSession() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return session
}
