'use client'

import { useId, useState } from 'react'
import { usePathname } from 'next/navigation'

type Status = 'idle' | 'loading' | 'success' | 'duplicate' | 'error'

/** Dark-background newsletter signup. `inline` puts the fields in one row on wider screens. */
export function NewsletterForm({ layout = 'stacked', cta = 'Join' }: { layout?: 'stacked' | 'inline'; cta?: string }) {
  const pathname = usePathname()
  const id = useId()
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

  const disabled = status === 'loading' || status === 'success'
  const inputClass =
    'w-full min-h-11 rounded-md bg-forest/80 border border-cream/25 text-cream placeholder:text-cream/50 px-3 py-2 text-base sm:text-sm font-body focus:outline-none focus-visible:border-gold-light focus-visible:ring-2 focus-visible:ring-gold-light/40'

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className={layout === 'inline' ? 'flex flex-col sm:flex-row gap-2' : 'flex flex-col gap-2'}
      >
        <label htmlFor={`${id}-name`} className="sr-only">First name</label>
        <input
          id={`${id}-name`}
          type="text"
          required
          autoComplete="given-name"
          placeholder="Your first name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
        <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
        <input
          id={`${id}-email`}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={disabled}
          className={`min-h-11 rounded-md bg-gold-light text-forest font-heading font-semibold text-sm py-2 px-5 hover:bg-cream transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-forest whitespace-nowrap ${layout === 'inline' ? '' : 'w-full mt-2'}`}
        >
          {status === 'loading' ? 'Joining…' : cta}
        </button>
      </form>

      <div aria-live="polite">
        {status === 'success' && (
          <p className="text-sm font-body text-gold-light mt-3">You&apos;re in! Welcome to the Twinkle family.</p>
        )}
        {status === 'duplicate' && (
          <p className="text-sm font-body text-cream/80 mt-3">Looks like you&apos;re already on the list!</p>
        )}
        {status === 'error' && (
          <p className="text-sm font-body text-red-300 mt-3">Something went wrong. Please try again.</p>
        )}
      </div>
    </div>
  )
}
