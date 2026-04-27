'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { APIError } from 'better-auth'

export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string ?? '').trim()
  const password = formData.get('password') as string ?? ''

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
      asResponse: false,
    })
  } catch (err) {
    if (err instanceof APIError) {
      return { error: err.body?.message ?? 'Invalid email or password' }
    }
    return { error: 'Login failed. Please try again.' }
  }

  redirect('/admin')
}

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() })
  redirect('/admin/login')
}
