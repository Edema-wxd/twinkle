'use client'

import { useTransition, useState } from 'react'
import { loginAction } from './actions'

export default function AdminLoginPage() {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMsg(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await loginAction(formData)
      if (result?.error) {
        setErrorMsg(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-gold leading-none">
            Twinkle Locs
          </h1>
          <p className="font-heading text-sm text-stone-500 mt-1 tracking-wide uppercase">
            Admin Panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-charcoal mb-1"
            >
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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-charcoal mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
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
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
