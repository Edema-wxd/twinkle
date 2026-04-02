'use client'

import { useState, useTransition } from 'react'

interface ShippingFormProps {
  settings: Record<string, string>
}

export function ShippingForm({ settings }: ShippingFormProps) {
  // Domestic delivery
  const [lagosRate, setLagosRate] = useState(settings.shipping_lagos_rate ?? '3000')
  const [lagosDays, setLagosDays] = useState(settings.shipping_lagos_days ?? '1–2 business days')
  const [otherRate, setOtherRate] = useState(settings.shipping_other_rate ?? '4500')
  const [otherDays, setOtherDays] = useState(settings.shipping_other_days ?? '3–5 business days')

  // International
  const [intlMessage, setIntlMessage] = useState(
    settings.shipping_intl_message ??
      "Hi, I'd like a shipping quote for an international order."
  )

  // Page intro copy
  const [pageIntro, setPageIntro] = useState(
    settings.shipping_page_intro ?? 'We deliver across Nigeria.'
  )

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/shipping', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shipping_lagos_rate: lagosRate,
            shipping_other_rate: otherRate,
            shipping_lagos_days: lagosDays,
            shipping_other_days: otherDays,
            shipping_intl_message: intlMessage,
            shipping_page_intro: pageIntro,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Error saving shipping settings')
          return
        }

        showToast('success', 'Saved')
      } catch {
        showToast('error', 'Network error — please try again')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-600/40'
              : 'bg-red-900/60 text-red-300 ring-1 ring-red-600/40'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Page Intro Copy */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Page Intro Copy
          </p>
          <div className="mt-2 border-t border-stone-700" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">Intro paragraph</label>
          <textarea
            value={pageIntro}
            onChange={(e) => setPageIntro(e.target.value)}
            placeholder="We deliver across Nigeria..."
            rows={3}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-y"
          />
          <p className="text-xs text-stone-500">Shown at the top of the /shipping page.</p>
        </div>
      </section>

      {/* Domestic Delivery */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Domestic Delivery
          </p>
          <div className="mt-2 border-t border-stone-700" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-300">Lagos rate (₦)</label>
            <input
              type="number"
              value={lagosRate}
              onChange={(e) => setLagosRate(e.target.value)}
              placeholder="3000"
              min="0"
              step="100"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-300">Lagos timeframe</label>
            <input
              type="text"
              value={lagosDays}
              onChange={(e) => setLagosDays(e.target.value)}
              placeholder="1–2 business days"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-300">
              Other states rate (₦)
            </label>
            <input
              type="number"
              value={otherRate}
              onChange={(e) => setOtherRate(e.target.value)}
              placeholder="4500"
              min="0"
              step="100"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-300">
              Other states timeframe
            </label>
            <input
              type="text"
              value={otherDays}
              onChange={(e) => setOtherDays(e.target.value)}
              placeholder="3–5 business days"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
        </div>
      </section>

      {/* International Shipping */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            International Shipping
          </p>
          <div className="mt-2 border-t border-stone-700" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">
            Pre-filled WhatsApp message
          </label>
          <textarea
            value={intlMessage}
            onChange={(e) => setIntlMessage(e.target.value)}
            placeholder="Hi, I'd like a shipping quote for an international order."
            rows={3}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-y"
          />
          <p className="text-xs text-stone-500">
            This text is URL-encoded into the WhatsApp CTA link on the shipping page.
          </p>
        </div>
      </section>

      {/* Save */}
      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2.5 bg-gold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isPending ? 'Saving…' : 'Save shipping info'}
      </button>
    </form>
  )
}
