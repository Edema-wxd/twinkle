'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from './RichTextEditor'
import { VariantTable, VariantRow } from './VariantTable'
import { ImageUploader } from './ImageUploader'
import type { ProductMaterial } from '@/lib/types/product'

interface ProductRow {
  id: string
  name: string
  slug: string
  description: string
  material: string
  is_featured: boolean
  is_active: boolean
  variants: unknown
  price_min: number
  price_max: number
  image: string
  images: string[]
  created_at: string
}

interface ProductFormProps {
  product?: ProductRow
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseVariants(raw: unknown): VariantRow[] {
  if (!Array.isArray(raw)) return []
  return raw.map((v) => ({
    id: typeof v.id === 'string' ? v.id : crypto.randomUUID(),
    name: typeof v.name === 'string' ? v.name : '',
    price: typeof v.price === 'number' ? v.price : 0,
    in_stock: typeof v.in_stock === 'boolean' ? v.in_stock : true,
    price_tiers:
      Array.isArray(v.price_tiers) && v.price_tiers.length > 0
        ? v.price_tiers
        : [{ qty: 1, price: typeof v.price === 'number' ? v.price : 0 }],
  }))
}

const MATERIALS: ProductMaterial[] = ['Gold', 'Silver', 'Crystal', 'Tools']

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isEdit = !!product

  const [name, setName] = useState(product?.name ?? '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [material, setMaterial] = useState<ProductMaterial>(
    (product?.material as ProductMaterial) ?? 'Gold'
  )
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false)
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const [variants, setVariants] = useState<VariantRow[]>(() =>
    parseVariants(product?.variants)
  )
  const [imageUrls, setImageUrls] = useState<string[]>(product?.images ?? [])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  // Auto-generate slug from name on blur (only if slug is empty and not in edit mode)
  function handleNameBlur() {
    if (!isEdit && slug === '' && name.trim() !== '') {
      setSlug(generateSlug(name.trim()))
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (name.trim() === '') {
      showToast('error', 'Product name is required')
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          name: name.trim(),
          slug: slug.trim() || generateSlug(name.trim()),
          description,
          material,
          is_featured: isFeatured,
          is_active: isActive,
          variants,
          image: imageUrls[0] ?? '/images/products/placeholder-bead.svg',
          images: imageUrls,
        }

        const url = isEdit
          ? `/api/admin/products/${product.id}`
          : '/api/admin/products'
        const method = isEdit ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to save product')
          return
        }

        showToast('success', 'Product saved')
        // Small delay so toast is briefly visible before redirect
        setTimeout(() => {
          router.push('/admin/products')
        }, 400)
      } catch {
        showToast('error', 'Network error — please try again')
      }
    })
  }

  function handleDelete() {
    if (!product) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/products/${product.id}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to delete product')
          setShowDeleteConfirm(false)
          return
        }

        router.push('/admin/products')
      } catch {
        showToast('error', 'Network error — please try again')
        setShowDeleteConfirm(false)
      }
    })
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-300 ring-1 ring-emerald-600/40'
              : 'bg-red-900/90 text-red-300 ring-1 ring-red-600/40'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          required
          placeholder="e.g. 24K Gold Loc Beads"
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="used-in-url"
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <p className="text-xs text-stone-500">Used in the product URL: /catalog/[slug]</p>
      </div>

      {/* Material / Category */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Category
        </label>
        <select
          value={material}
          onChange={(e) => setMaterial(e.target.value as ProductMaterial)}
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Toggles row */}
      <div className="flex flex-wrap gap-6">
        {/* is_featured */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="w-4 h-4 accent-amber-500"
          />
          <span className="text-sm text-stone-300">Featured on homepage</span>
        </label>

        {/* is_active toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isActive ? 'bg-amber-600' : 'bg-stone-600'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className="text-sm text-stone-300">
            {isActive ? 'Active (visible on storefront)' : 'Archived (hidden)'}
          </span>
        </label>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Description
        </label>
        <RichTextEditor value={description} onChange={setDescription} />
      </div>

      {/* Variants */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Variants
        </label>
        <p className="text-xs text-stone-500 mb-2">
          Each variant is a size/option. Set price_tiers for bulk pricing; a single tier is fine for simple pricing.
        </p>
        <VariantTable variants={variants} onChange={setVariants} />
      </div>

      {/* Product images */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Product images <span className="text-stone-500 font-normal">(up to 5)</span>
        </label>
        <p className="text-xs text-stone-500 mb-2">
          First image is used as the product card thumbnail. Drag to reorder.
        </p>
        <ImageUploader
          productId={product?.id}
          initialImages={product?.images ?? []}
          onImagesChange={(urls) => setImageUrls(urls)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? 'Saving…' : 'Save product'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            disabled={isPending}
            className="px-4 py-2.5 text-stone-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Delete button — edit mode only */}
        {isEdit && (
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">Are you sure?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                >
                  {isPending ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-stone-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isPending}
                className="px-4 py-2 text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Delete product
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  )
}
