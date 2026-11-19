'use client'

import { useState, useTransition } from 'react'

export type PromoCode = {
  id: string
  code: string
  discountType: string
  discountValue: number
  maxUses: number | null
  currentUses: number
  /** Smallest items subtotal (₦) the code works on; null = no minimum */
  minOrder: number | null
  expiresAt: string | null
  isActive: boolean
  /** null = made in Admin, 'welcome' = issued by the ad landing page's email sign-up */
  source: string | null
  issuedToEmail: string | null
  createdAt: string
}

export type WelcomeSummary = { issued: number; used: number }

interface PromoCodesManagerProps {
  initialCodes: PromoCode[]
  welcomeSummary: WelcomeSummary
}

const TYPE_LABELS: Record<string, string> = {
  free_shipping: 'Free Shipping',
  percentage: 'Percentage',
  fixed: 'Fixed Amount',
}

const inputClass =
  'w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white font-body text-sm placeholder:text-stone-500 focus:outline-none focus:border-gold'
const smallInput =
  'w-28 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-white text-sm placeholder:text-stone-500 focus:outline-none focus:border-gold'
const th = 'px-4 py-3 text-xs font-heading text-stone-400 uppercase tracking-wide'

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`

function formatValue(code: PromoCode) {
  if (code.discountType === 'free_shipping') return '-'
  if (code.discountType === 'percentage') return `${code.discountValue}%`
  return naira(code.discountValue)
}

function formatMinOrder(minOrder: number | null) {
  return minOrder && minOrder > 0 ? naira(minOrder) : 'None'
}

function formatExpiry(expiresAt: string | null, withTime = false) {
  if (!expiresAt) return 'Never'
  return new Date(expiresAt).toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

/** YYYY-MM-DD in Lagos, for a date input */
function toDateInput(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) : ''
}

type EditState = { id: string; discountValue: string; maxUses: string; minOrder: string; expiresAt: string }

export function PromoCodesManager({ initialCodes, welcomeSummary }: PromoCodesManagerProps) {
  const [codes, setCodes] = useState<PromoCode[]>(initialCodes)
  const [welcome, setWelcome] = useState<WelcomeSummary>(welcomeSummary)
  const [welcomeCodes, setWelcomeCodes] = useState<PromoCode[] | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeLoading, setWelcomeLoading] = useState(false)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Create form state
  const [form, setForm] = useState({
    code: '',
    discountType: 'free_shipping',
    discountValue: '',
    maxUses: '',
    minOrder: '',
    expiresAt: '',
  })

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  function handleFormChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  /** Put an updated code back into whichever list holds it */
  function replaceCode(updated: PromoCode) {
    setCodes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setWelcomeCodes((prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? prev)
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
            minOrder: form.minOrder ? Number(form.minOrder) : null,
            expiresAt: form.expiresAt || null,
          }),
        })
        const data = (await res.json()) as { code?: PromoCode; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Failed to create')
        setCodes((prev) => [...prev, data.code!])
        setForm({ code: '', discountType: 'free_shipping', discountValue: '', maxUses: '', minOrder: '', expiresAt: '' })
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
        const data = (await res.json()) as { code?: PromoCode; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Failed to update')
        replaceCode(data.code!)
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  function startEdit(c: PromoCode) {
    setEditing({
      id: c.id,
      discountValue: String(c.discountValue),
      maxUses: c.maxUses === null ? '' : String(c.maxUses),
      minOrder: c.minOrder ? String(c.minOrder) : '',
      expiresAt: toDateInput(c.expiresAt),
    })
  }

  function saveEdit(c: PromoCode) {
    if (!editing) return
    const patch: Record<string, unknown> = { id: c.id }
    if (c.discountType !== 'free_shipping' && editing.discountValue !== String(c.discountValue)) patch.discountValue = Number(editing.discountValue || 0)
    if (editing.maxUses !== (c.maxUses === null ? '' : String(c.maxUses))) patch.maxUses = editing.maxUses ? Number(editing.maxUses) : null
    if (editing.minOrder !== (c.minOrder ? String(c.minOrder) : '')) patch.minOrder = editing.minOrder ? Number(editing.minOrder) : null
    // Only send the date when it changed, so an exact expiry time isn't rounded to midnight
    if (editing.expiresAt !== toDateInput(c.expiresAt)) patch.expiresAt = editing.expiresAt || null

    if (Object.keys(patch).length === 1) {
      setEditing(null)
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/promo-codes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        const data = (await res.json()) as { code?: PromoCode; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Failed to update')
        replaceCode(data.code!)
        setEditing(null)
        showToast('success', `"${c.code}" updated`)
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to update')
      }
    })
  }

  function handleDelete(target: PromoCode) {
    if (!confirm(`Delete promo code "${target.code}"? This cannot be undone.`)) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/promo-codes?id=${target.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = (await res.json()) as { error?: string }
          throw new Error(data.error ?? 'Failed to delete')
        }
        setCodes((prev) => prev.filter((c) => c.id !== target.id))
        if (target.source === 'welcome') {
          setWelcomeCodes((prev) => prev?.filter((c) => c.id !== target.id) ?? prev)
          setWelcome((w) => ({ issued: Math.max(0, w.issued - 1), used: Math.max(0, w.used - (target.currentUses > 0 ? 1 : 0)) }))
        }
        showToast('success', `"${target.code}" deleted`)
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  async function toggleWelcome() {
    if (showWelcome) {
      setShowWelcome(false)
      return
    }
    setShowWelcome(true)
    if (welcomeCodes) return
    setWelcomeLoading(true)
    try {
      const res = await fetch('/api/admin/promo-codes?source=welcome')
      const data = (await res.json()) as { codes?: PromoCode[]; error?: string }
      if (!res.ok || !data.codes) throw new Error(data.error ?? 'Could not load the welcome codes')
      setWelcomeCodes(data.codes)
    } catch (err) {
      setShowWelcome(false)
      showToast('error', err instanceof Error ? err.message : 'Could not load the welcome codes')
    } finally {
      setWelcomeLoading(false)
    }
  }

  function actions(c: PromoCode, opts: { canEdit: boolean }) {
    return (
      <div className="flex items-center gap-3">
        {opts.canEdit && (
          <button onClick={() => startEdit(c)} disabled={isPending} className="text-xs text-stone-400 hover:text-white underline transition-colors disabled:opacity-40">
            Edit
          </button>
        )}
        <button
          onClick={() => toggleActive(c.id, c.isActive)}
          disabled={isPending}
          className="text-xs text-stone-400 hover:text-white underline transition-colors disabled:opacity-40"
        >
          {c.isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={() => handleDelete(c)}
          disabled={isPending}
          className="text-xs text-red-400 hover:text-red-300 underline transition-colors disabled:opacity-40"
        >
          Delete
        </button>
      </div>
    )
  }

  function statusBadge(active: boolean, label?: string) {
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${active ? 'bg-green-900/60 text-green-400' : 'bg-stone-700 text-stone-400'}`}
      >
        {label ?? (active ? 'Active' : 'Inactive')}
      </span>
    )
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          role="status"
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
            <label htmlFor="promo-code" className="block text-xs font-heading text-stone-400 mb-1">Code *</label>
            <input
              id="promo-code"
              type="text"
              required
              value={form.code}
              onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
              placeholder="FREESHIP"
              className={`${inputClass} uppercase`}
            />
          </div>

          <div>
            <label htmlFor="promo-type" className="block text-xs font-heading text-stone-400 mb-1">Type *</label>
            <select id="promo-type" value={form.discountType} onChange={(e) => handleFormChange('discountType', e.target.value)} className={inputClass}>
              <option value="free_shipping">Free Shipping</option>
              <option value="percentage">Percentage Off</option>
              <option value="fixed">Fixed Amount (₦)</option>
            </select>
          </div>

          {form.discountType !== 'free_shipping' && (
            <div>
              <label htmlFor="promo-value" className="block text-xs font-heading text-stone-400 mb-1">
                {form.discountType === 'percentage' ? 'Discount %' : 'Discount ₦'}
              </label>
              <input
                id="promo-value"
                type="number"
                min="1"
                value={form.discountValue}
                onChange={(e) => handleFormChange('discountValue', e.target.value)}
                placeholder={form.discountType === 'percentage' ? '10' : '2000'}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="promo-max" className="block text-xs font-heading text-stone-400 mb-1">Max Uses (blank = unlimited)</label>
            <input
              id="promo-max"
              type="number"
              min="1"
              value={form.maxUses}
              onChange={(e) => handleFormChange('maxUses', e.target.value)}
              placeholder="50"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="promo-min" className="block text-xs font-heading text-stone-400 mb-1">Minimum order ₦ (blank = none)</label>
            <input
              id="promo-min"
              type="number"
              min="0"
              step="1000"
              value={form.minOrder}
              onChange={(e) => handleFormChange('minOrder', e.target.value)}
              placeholder="50000"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-stone-500">Items in the cart, before delivery.</p>
          </div>

          <div>
            <label htmlFor="promo-expiry" className="block text-xs font-heading text-stone-400 mb-1">Expiry Date (blank = never)</label>
            <input
              id="promo-expiry"
              type="date"
              value={form.expiresAt}
              onChange={(e) => handleFormChange('expiresAt', e.target.value)}
              className={inputClass}
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
        <h2 className="font-heading text-lg font-semibold text-white mb-4">Promo Codes ({codes.length})</h2>

        {codes.length === 0 ? (
          <p className="text-stone-400 font-body text-sm">No promo codes yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-700">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-stone-700 text-left">
                  <th className={th}>Code</th>
                  <th className={th}>Type</th>
                  <th className={th}>Value</th>
                  <th className={th}>Min order</th>
                  <th className={th}>Uses</th>
                  <th className={th}>Expires</th>
                  <th className={th}>Status</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) =>
                  editing?.id === c.id ? (
                    <tr key={c.id} className="border-b border-stone-800 bg-stone-900/60">
                      <td className="px-4 py-3 text-white font-semibold tracking-wide">{c.code}</td>
                      <td className="px-4 py-3 text-stone-300">{TYPE_LABELS[c.discountType] ?? c.discountType}</td>
                      <td className="px-4 py-3">
                        {c.discountType === 'free_shipping' ? (
                          <span className="text-stone-300">-</span>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            aria-label="Discount value"
                            value={editing.discountValue}
                            onChange={(e) => setEditing({ ...editing, discountValue: e.target.value })}
                            className={smallInput}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          aria-label="Minimum order in naira"
                          placeholder="None"
                          value={editing.minOrder}
                          onChange={(e) => setEditing({ ...editing, minOrder: e.target.value })}
                          className={smallInput}
                        />
                      </td>
                      <td className="px-4 py-3 text-stone-300">
                        <span className="mr-1">{c.currentUses} /</span>
                        <input
                          type="number"
                          min="1"
                          aria-label="Max uses"
                          placeholder="No limit"
                          value={editing.maxUses}
                          onChange={(e) => setEditing({ ...editing, maxUses: e.target.value })}
                          className={smallInput}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          aria-label="Expiry date"
                          value={editing.expiresAt}
                          onChange={(e) => setEditing({ ...editing, expiresAt: e.target.value })}
                          className="bg-stone-800 border border-stone-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-gold"
                        />
                      </td>
                      <td className="px-4 py-3">{statusBadge(c.isActive)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => saveEdit(c)}
                            disabled={isPending}
                            className="px-3 py-1 bg-gold hover:bg-gold-deep disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditing(null)} disabled={isPending} className="text-xs text-stone-400 hover:text-white underline">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="border-b border-stone-800 hover:bg-stone-900/50">
                      <td className="px-4 py-3 text-white font-semibold tracking-wide">{c.code}</td>
                      <td className="px-4 py-3 text-stone-300">{TYPE_LABELS[c.discountType] ?? c.discountType}</td>
                      <td className="px-4 py-3 text-stone-300">{formatValue(c)}</td>
                      <td className="px-4 py-3 text-stone-300">{formatMinOrder(c.minOrder)}</td>
                      <td className="px-4 py-3 text-stone-300">
                        {c.currentUses}
                        {c.maxUses !== null ? ` / ${c.maxUses}` : ''}
                      </td>
                      <td className="px-4 py-3 text-stone-300">{formatExpiry(c.expiresAt)}</td>
                      <td className="px-4 py-3">{statusBadge(c.isActive)}</td>
                      <td className="px-4 py-3">{actions(c, { canEdit: true })}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Welcome codes from the ad landing page */}
      <div className="space-y-4 rounded-xl bg-stone-900 p-5 ring-1 ring-stone-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold text-white">Welcome codes</h2>
            <p className="mt-1 text-sm text-stone-400" data-testid="welcome-summary">
              {welcome.issued === 1 ? '1 welcome code' : `${welcome.issued} welcome codes`} issued by the landing page, {welcome.used} used.
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Everyone who signs up on the ad landing page gets their own code that works once. They&rsquo;re kept out of the list above so it
              stays tidy. Change the offer in Ad landing page.
            </p>
          </div>
          {welcome.issued > 0 && (
            <button
              type="button"
              onClick={toggleWelcome}
              aria-expanded={showWelcome}
              disabled={welcomeLoading}
              className="shrink-0 rounded-lg bg-stone-800 px-4 py-2 text-sm text-stone-200 transition-colors hover:bg-stone-700 disabled:opacity-60"
            >
              {welcomeLoading ? 'Loading…' : showWelcome ? 'Hide welcome codes' : 'Show welcome codes'}
            </button>
          )}
        </div>

        {showWelcome && welcomeCodes && (
          <>
            {welcomeCodes.length < welcome.issued && (
              <p className="text-xs text-stone-500">
                Showing the newest {welcomeCodes.length} of {welcome.issued}.
              </p>
            )}
            {welcomeCodes.length === 0 ? (
              <p className="text-sm text-stone-400">No welcome codes yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-stone-700">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="border-b border-stone-700 text-left">
                      <th className={th}>Code</th>
                      <th className={th}>Issued to</th>
                      <th className={th}>Value</th>
                      <th className={th}>Min order</th>
                      <th className={th}>Used</th>
                      <th className={th}>Expires</th>
                      <th className={th}>Status</th>
                      <th className={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {welcomeCodes.map((c) => {
                      const used = c.currentUses > 0
                      const expired = c.expiresAt !== null && new Date(c.expiresAt).getTime() < Date.now()
                      return (
                        <tr key={c.id} className="border-b border-stone-800 hover:bg-stone-900/50">
                          <td className="px-4 py-3 text-white font-semibold tracking-wide">{c.code}</td>
                          <td className="px-4 py-3 text-stone-300 break-all">{c.issuedToEmail ?? '-'}</td>
                          <td className="px-4 py-3 text-stone-300">{formatValue(c)}</td>
                          <td className="px-4 py-3 text-stone-300">{formatMinOrder(c.minOrder)}</td>
                          <td className="px-4 py-3 text-stone-300">{used ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-3 text-stone-300 whitespace-nowrap">{formatExpiry(c.expiresAt, true)}</td>
                          <td className="px-4 py-3">
                            {used ? statusBadge(false, 'Used') : expired ? statusBadge(false, 'Expired') : statusBadge(c.isActive)}
                          </td>
                          <td className="px-4 py-3">{actions(c, { canEdit: false })}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
