import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './index'

export async function getAdminSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function requireAdminSession() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return session
}
