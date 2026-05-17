'use client'

import { useState, useTransition } from 'react'

type PromoCode = {
  id: string
  code: string
  discountType: string
  discountValue: number
  maxUses: number | null
  currentUses: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

interface PromoCodesManagerProps {
  initialCodes: PromoCode[]
}

const TYPE_LABELS: Record<string, string> = {
  free_shipping: 'Free Shipping',
  percentage: 'Percentage',
  fixed: 'Fixed Amount',
}

function formatValue(code: PromoCode) {
  if (code.discountType === 'free_shipping') return '—'
  if (code.discountType === 'percentage') return `${code.discountValue}%`
  return `₦${code.discountValue.toLocaleString()}`
}

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return 'Never'
  return new Date(expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PromoCodesManager({ initialCodes }: PromoCodesManagerProps) {
  const [codes, setCodes] = useState<PromoCode[]>(initialCodes)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Create form state
  const [form, setForm] = useState({
    code: '',
    discountType: 'free_shipping',
    discountValue: '',
    maxUses: '',
    expiresAt: '',
  })

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  function handleFormChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/promo-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: form.code.trim(),
            discountType: form.discountType,
            discountValue: form.discountValue ? Number(form.discountValue) : 0,
            maxUses: form.maxUses ? Number(form.maxUses) : null,
            expiresAt: form.expiresAt || null,
          }),
        })
        const data = await res.json() as { code?: PromoCode; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Failed to create')
        setCodes((prev) => [...prev, data.code!])
        setForm({ code: '', discountType: 'free_shipping', discountValue: '', maxUses: '', expiresAt: '' })
        showToast('success', 'Promo code created')
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to create promo code')
      }
    })
  }

  function toggleActive(id: string, current: boolean) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/promo-codes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, isActive: !current }),
        })
        const data = await res.json() as { code?: PromoCode; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Failed to update')
        setCodes((prev) => prev.map((c) => (c.id === id ? data.code! : c)))
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  function handleDelete(id: string, code: string) {
    if (!confirm(`Delete promo code "${code}"? This cannot be undone.`)) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/promo-codes?id=${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json() as { error?: string }
          throw new Error(data.error ?? 'Failed to delete')
        }
        setCodes((prev) => prev.filter((c) => c.id !== id))
        showToast('success', `"${code}" deleted`)
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-body shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-stone-900 rounded-xl p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-white">Create Promo Code</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-heading text-stone-400 mb-1">Code *</label>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
              placeholder="FREESHIP"
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm placeholder:text-stone-500 focus:outline-none focus:border-gold uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-heading text-stone-400 mb-1">Type *</label>
            <select
              value={form.discountType}
              onChange={(e) => handleFormChange('discountType', e.target.value)}
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-gold"
            >
              <option value="free_shipping">Free Shipping</option>
              <option value="percentage">Percentage Off</option>
              <option value="fixed">Fixed Amount (₦)</option>
            </select>
          </div>

          {form.discountType !== 'free_shipping' && (
            <div>
              <label className="block text-xs font-heading text-stone-400 mb-1">
                {form.discountType === 'percentage' ? 'Discount %' : 'Discount ₦'}
              </label>
              <input
                type="number"
                min="1"
                value={form.discountValue}
                onChange={(e) => handleFormChange('discountValue', e.target.value)}
                placeholder={form.discountType === 'percentage' ? '10' : '2000'}
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm placeholder:text-stone-500 focus:outline-none focus:border-gold"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-heading text-stone-400 mb-1">Max Uses (blank = unlimited)</label>
            <input
              type="number"
              min="1"
              value={form.maxUses}
              onChange={(e) => handleFormChange('maxUses', e.target.value)}
              placeholder="50"
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm placeholder:text-stone-500 focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-heading text-stone-400 mb-1">Expiry Date (blank = never)</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => handleFormChange('expiresAt', e.target.value)}
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || !form.code.trim()}
          className="px-5 py-2.5 bg-gold text-white font-heading font-semibold text-sm rounded-lg disabled:opacity-40 hover:bg-gold/90 transition-colors"
        >
          {isPending ? 'Creating…' : 'Create Code'}
        </button>
      </form>

      {/* Codes table */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-white mb-4">
          Promo Codes ({codes.length})
        </h2>

        {codes.length === 0 ? (
          <p className="text-stone-400 font-body text-sm">No promo codes yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-700">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-stone-700 text-left">
                  <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Code</th>
                  <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Value</th>
                  <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Uses</th>
                  <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Expires</th>
                  <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-stone-800 hover:bg-stone-900/50">
                    <td className="px-4 py-3 text-white font-semibold tracking-wide">{c.code}</td>
                    <td className="px-4 py-3 text-stone-300">{TYPE_LABELS[c.discountType] ?? c.discountType}</td>
                    <td className="px-4 py-3 text-stone-300">{formatValue(c)}</td>
                    <td className="px-4 py-3 text-stone-300">
                      {c.currentUses}{c.maxUses !== null ? ` / ${c.maxUses}` : ''}
                    </td>
                    <td className="px-4 py-3 text-stone-300">{formatExpiry(c.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.isActive ? 'bg-green-900/60 text-green-400' : 'bg-stone-700 text-stone-400'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-3">
                      <button
                        onClick={() => toggleActive(c.id, c.isActive)}
                        disabled={isPending}
                        className="text-xs text-stone-400 hover:text-white underline transition-colors disabled:opacity-40"
                      >
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.code)}
                        disabled={isPending}
                        className="text-xs text-red-400 hover:text-red-300 underline transition-colors disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
