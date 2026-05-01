'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function RecoverOrderForm() {
  const [reference, setReference] = useState('')
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRecover(e: React.FormEvent) {
    e.preventDefault()
    const ref = reference.trim()
    if (!ref) return

    setResult(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/paystack/verify/${encodeURIComponent(ref)}`)
        const data = await res.json().catch(() => ({}))

        if (res.ok) {
          setResult({ type: 'success', message: `Order recovered successfully.` })
          setReference('')
          router.refresh()
        } else {
          setResult({ type: 'error', message: data?.error ?? `Failed (${res.status}) — check the reference and try again.` })
        }
      } catch {
        setResult({ type: 'error', message: 'Network error — please try again.' })
      }
    })
  }

  return (
    <div className="bg-stone-800 border border-stone-700 rounded-xl p-5">
      <h2 className="font-heading text-sm font-semibold text-white mb-1">Recover a paid order</h2>
      <p className="text-xs text-stone-400 mb-4">
        Paste a Paystack reference from your dashboard to pull a missed payment into the orders list.
      </p>
      <form onSubmit={handleRecover} className="flex gap-3">
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. tw-1234567890-abc12"
          className="flex-1 px-3 py-2 bg-stone-900 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
        <button
          type="submit"
          disabled={isPending || !reference.trim()}
          className="px-4 py-2 bg-gold hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          {isPending ? 'Recovering…' : 'Recover'}
        </button>
      </form>
      {result && (
        <p className={`mt-3 text-sm ${result.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}
