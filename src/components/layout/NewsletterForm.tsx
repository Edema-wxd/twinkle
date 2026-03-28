'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

type Status = 'idle' | 'loading' | 'success' | 'duplicate' | 'error'

export function NewsletterForm() {
  const pathname = usePathname()
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, email, source_page: pathname }),
      })
      if (res.status === 409) setStatus('duplicate')
      else if (res.ok) setStatus('success')
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          required
          placeholder="Your first name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={status === 'loading' || status === 'success'}
          className="w-full rounded-md bg-cocoa border border-cream/20 text-cream placeholder:text-cream/40 px-3 py-2 text-sm focus:outline-none focus:border-gold font-body"
        />
        <input
          type="email"
          required
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading' || status === 'success'}
          className="w-full rounded-md bg-cocoa border border-cream/20 text-cream placeholder:text-cream/40 px-3 py-2 text-sm focus:outline-none focus:border-gold font-body"
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className="w-full mt-2 rounded-md bg-gold text-cocoa font-heading font-semibold text-sm py-2 px-4 hover:bg-gold/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Joining...' : 'Join'}
        </button>
      </form>

      {status === 'success' && (
        <p className="text-sm font-body text-gold mt-3">
          {"You're in! Welcome to the Twinkle family."}
        </p>
      )}
      {status === 'duplicate' && (
        <p className="text-sm font-body text-cream/70 mt-3">
          {"Looks like you're already on the list!"}
        </p>
      )}
      {status === 'error' && (
        <p className="text-sm font-body text-terracotta mt-3">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  )
}
