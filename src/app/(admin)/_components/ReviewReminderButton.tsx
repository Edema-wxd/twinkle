'use client'

import { useState } from 'react'

interface ReviewReminderButtonProps {
  orderId: string
  alreadySent: boolean
}

export function ReviewReminderButton({ orderId, alreadySent: initialSent }: ReviewReminderButtonProps) {
  const [sent, setSent] = useState(initialSent)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    if (sent || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/review-reminder`, { method: 'POST' })
      const data = await res.json() as { sent?: boolean; alreadySent?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reminder')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/40 text-green-400 border border-green-800 text-sm font-medium">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Review reminder sent
      </span>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleSend}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors text-sm font-semibold disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {loading ? 'Sending…' : 'Send review reminder'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
