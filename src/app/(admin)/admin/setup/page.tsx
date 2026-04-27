'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth/client'

export default function AdminSetupPage() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMsg(null)
    setIsPending(true)

    const formData = new FormData(e.currentTarget)
    const name = (formData.get('name') as string).trim()
    const email = (formData.get('email') as string).trim()
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password !== confirm) {
      setErrorMsg('Passwords do not match')
      setIsPending(false)
      return
    }

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: '/admin',
    })

    if (error) {
      setErrorMsg(error.message ?? 'Failed to create account')
      setIsPending(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/admin'), 1500)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-4xl mb-3">✓</div>
          <p className="font-heading font-semibold text-charcoal">Account created — redirecting…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-gold leading-none">Twinkle Locs</h1>
          <p className="font-heading text-sm text-stone-500 mt-1 tracking-wide uppercase">
            Create Admin Account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-1">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              disabled={isPending}
              defaultValue="Admin"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent disabled:opacity-50"
              placeholder="admin@twinklelocs.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              disabled={isPending}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent disabled:opacity-50"
              placeholder="min. 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-charcoal mb-1">
              Confirm password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              disabled={isPending}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-gold text-white font-heading font-semibold text-sm rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Creating account…' : 'Create admin account'}
          </button>

          <p className="text-center text-xs text-stone-400 pt-1">
            Already have an account?{' '}
            <a href="/admin/login" className="text-gold hover:underline">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  )
}
