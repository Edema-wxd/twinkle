'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { RichTextEditor } from './RichTextEditor'
import { useUploadThing } from '@/lib/uploadthing'
import type { BlogPost } from '@/types/db'

export type PickerProduct = {
  id: string
  name: string
  slug: string
  image: string
  price_min: number
}

interface BlogPostFormProps {
  post?: BlogPost
  products: PickerProduct[]
  existingTags: string[]
}

const SITE_SUFFIX = ' | Twinkle Locs'
const SITE_HOST = 'twinklelocs.com'
const MAX_PRODUCTS = 4

// ── Client-side text helpers (kept dependency-free; sanitize-html is server only) ──
function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}
function slugify(input: string): string {
  return input.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Snapshot = Record<string, unknown>

export function BlogPostForm({ post, products, existingTags }: BlogPostFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = !!post

  const [title, setTitle] = useState(post?.title ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [featuredImage, setFeaturedImage] = useState<string | null>(post?.featured_image ?? null)
  const [tag, setTag] = useState(post?.tag ?? '')
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? '')
  const [seoDescription, setSeoDescription] = useState(post?.seo_description ?? '')
  const [isFeatured, setIsFeatured] = useState(post?.is_featured ?? false)
  const [productIds, setProductIds] = useState<string[]>(post?.featured_product_ids ?? [])
  const [published, setPublished] = useState(post?.published ?? false)
  const [publishedAt, setPublishedAt] = useState(toLocalInput(post?.published_at ?? null))

  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { startUpload } = useUploadThing('contentImages', {
    onClientUploadComplete: (res) => {
      if (res?.[0]) setFeaturedImage(res[0].ufsUrl)
    },
    onUploadError: (err) => setUploadError(`Upload failed: ${err.message}`),
  })

  // ── Dirty tracking ──────────────────────────────────────────────────────────
  const snapshot = useMemo<Snapshot>(
    () => ({ title, slug, excerpt, body, featuredImage, tag, seoTitle, seoDescription, isFeatured, productIds: productIds.join(','), published, publishedAt }),
    [title, slug, excerpt, body, featuredImage, tag, seoTitle, seoDescription, isFeatured, productIds, published, publishedAt],
  )
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(snapshot))
  const isDirty = JSON.stringify(snapshot) !== savedSnapshot

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  function showToast(type: 'success' | 'error', message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ type, message })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  // ── Derived content metrics ────────────────────────────────────────────────
  const text = useMemo(() => plainText(body), [body])
  const words = text ? text.split(' ').length : 0
  const minutes = Math.max(1, Math.round(words / 220))
  const effectiveTitle = (seoTitle || title || 'Your post title').trim()
  const effectiveDescription = (seoDescription || excerpt || text.slice(0, 160)).trim()
  const effectiveSlug = slug || slugify(title) || 'your-post'

  const checklist = useMemo(() => {
    const titleLen = (seoTitle || title).length + SITE_SUFFIX.length
    const descLen = (seoDescription || excerpt).length
    const imgs = body.match(/<img\b[^>]*>/gi) ?? []
    const imgsMissingAlt = imgs.filter((i) => !/alt="[^"]+"/i.test(i)).length
    return [
      { ok: words >= 300, label: 'At least 300 words', hint: `${words} so far. Longer guides rank better on Google.` },
      { ok: /<h2[\s>]/i.test(body), label: 'Broken into sections', hint: 'Add an H2 heading so readers can skim.' },
      { ok: !!featuredImage, label: 'Cover image', hint: 'Posts with a photo get far more taps when shared on WhatsApp and Instagram.' },
      { ok: descLen >= 70 && descLen <= 160, label: 'Search description 70 to 160 characters', hint: `${descLen} characters now.` },
      { ok: titleLen <= 65, label: 'Title fits in Google results', hint: `${titleLen} of ~60 characters including "Twinkle Locs".` },
      { ok: productIds.length > 0 || /href="\/catalog/i.test(body), label: 'Links to a product', hint: 'Add "Shop the look" products or link to a bead in the text.' },
      { ok: !!tag, label: 'Has a category', hint: 'Categories power the filters on the blog page.' },
      { ok: imgsMissingAlt === 0, label: 'Images described (alt text)', hint: `${imgsMissingAlt} image${imgsMissingAlt === 1 ? '' : 's'} without a description.` },
    ]
  }, [words, body, featuredImage, seoDescription, excerpt, seoTitle, title, productIds, tag])
  const score = checklist.filter((c) => c.ok).length

  const selectedProducts = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is PickerProduct => Boolean(p))
  const productMatches = products
    .filter((p) => !productIds.includes(p.id))
    .filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase()))
    .slice(0, 6)

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      await startUpload([file])
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const save = useCallback(
    (nextPublished: boolean) => {
      if (title.trim() === '') {
        showToast('error', 'Give your post a title first')
        return
      }
      const finalSlug = slugify(slug || title)
      if (!finalSlug) {
        showToast('error', 'The URL slug needs at least one letter or number')
        return
      }

      startTransition(async () => {
        try {
          const payload = {
            title: title.trim(),
            slug: finalSlug,
            excerpt,
            body,
            featured_image: featuredImage,
            tag: tag.trim() || null,
            seo_title: seoTitle.trim() || null,
            seo_description: seoDescription.trim() || null,
            is_featured: isFeatured,
            featured_product_ids: productIds,
            published: nextPublished,
            published_at: nextPublished && publishedAt ? new Date(publishedAt).toISOString() : undefined,
          }

          const res = await fetch(isEdit ? `/api/admin/blog/${post.id}` : '/api/admin/blog', {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const data = await res.json().catch(() => ({}))

          if (!res.ok) {
            showToast('error', data.error ?? 'Failed to save post')
            return
          }

          const saved = data.post as { id: string; slug: string; published_at: string | null; publishedAt?: string | null } | undefined
          setSlug(finalSlug)
          setPublished(nextPublished)
          const savedAt = saved?.publishedAt ?? saved?.published_at ?? null
          const nextPublishedAt = nextPublished ? toLocalInput(savedAt) || publishedAt : ''
          setPublishedAt(nextPublishedAt)
          setSavedSnapshot(
            JSON.stringify({ ...snapshot, slug: finalSlug, published: nextPublished, publishedAt: nextPublishedAt }),
          )

          const verb = nextPublished ? (post?.published ? 'Changes are live' : 'Published, it is live on the blog') : 'Draft saved'
          showToast('success', verb)

          if (!isEdit && saved?.id) {
            router.replace(`/admin/blog/${saved.id}`)
          } else {
            router.refresh()
          }
        } catch {
          showToast('error', 'Network error, please try again')
        }
      })
    },
    [title, slug, excerpt, body, featuredImage, tag, seoTitle, seoDescription, isFeatured, productIds, publishedAt, isEdit, post, router, snapshot],
  )

  // Cmd/Ctrl + S saves without changing publish state
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!isPending) save(published)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save, published, isPending])

  function handleDelete() {
    if (!post) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to delete post')
          setShowDeleteConfirm(false)
          return
        }
        setSavedSnapshot(JSON.stringify(snapshot))
        router.push('/admin/blog')
        router.refresh()
      } catch {
        showToast('error', 'Network error, please try again')
        setShowDeleteConfirm(false)
      }
    })
  }

  const liveUrl = `/blog/${post?.slug ?? effectiveSlug}`

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save(published)
      }}
      className="pb-24"
    >
      {/* Toast */}
      <div aria-live="polite" className="fixed bottom-6 right-6 z-50">
        {toast && (
          <div
            className={`px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-200 ring-1 ring-emerald-600/40'
                : 'bg-red-900/95 text-red-200 ring-1 ring-red-600/40'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="sticky top-14 lg:top-0 z-20 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 mb-6 bg-stone-950/90 backdrop-blur border-b border-stone-800 flex flex-wrap items-center gap-3">
        <Link href="/admin/blog" className="text-sm text-stone-400 hover:text-white transition-colors">
          &larr; All posts
        </Link>
        <StatusPill published={published} dirty={isDirty} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-stone-800 p-0.5 ring-1 ring-stone-700" role="tablist" aria-label="Editor mode">
            {(['write', 'preview'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  mode === m ? 'bg-stone-600 text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {isEdit && post?.published && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-sm text-stone-300 hover:text-white transition-colors">
              View live &#8599;
            </a>
          )}
          {published ? (
            <>
              <button type="button" onClick={() => save(false)} disabled={isPending} className="px-3 py-2 text-sm text-stone-300 hover:text-white disabled:opacity-50 transition-colors">
                Unpublish
              </button>
              <button type="submit" disabled={isPending} className="px-4 py-2 bg-gold hover:bg-gold-deep disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                {isPending ? 'Saving…' : 'Update post'}
              </button>
            </>
          ) : (
            <>
              <button type="submit" disabled={isPending} className="px-4 py-2 bg-stone-800 hover:bg-stone-700 ring-1 ring-stone-600 disabled:opacity-50 text-stone-100 text-sm font-medium rounded-lg transition-colors">
                {isPending ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" onClick={() => save(true)} disabled={isPending} className="px-4 py-2 bg-gold hover:bg-gold-deep disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                Publish
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-8">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="space-y-6 min-w-0">
          {mode === 'write' ? (
            <>
              <div>
                <label htmlFor="post-title" className="sr-only">Title</label>
                <input
                  id="post-title"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Post title, e.g. 5 ways to style gold beads for a wedding"
                  className="w-full bg-transparent border-0 border-b border-stone-700 focus:border-gold px-0 py-3 text-3xl font-heading font-bold text-white placeholder-stone-600 focus:outline-none focus:ring-0"
                />
              </div>

              <Field
                id="post-excerpt"
                label="Teaser"
                hint="Shown on the blog cards and under the title. One or two inviting sentences."
                counter={{ value: excerpt.length, ideal: [70, 160] }}
              >
                <textarea
                  id="post-excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                  placeholder="Everything you need to know before your first set of loc beads…"
                  className={inputClass + ' resize-y'}
                />
              </Field>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="block text-sm font-medium text-stone-300">Story</span>
                  <span className="text-xs text-stone-500 tabular-nums">
                    {words.toLocaleString()} words &middot; {minutes} min read
                  </span>
                </div>
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  variant="article"
                  canvas="light"
                  placeholder="Start your story. Use H2 for sections, the quote button for a stand-out line, and the link button to point readers to a product."
                />
              </div>
            </>
          ) : (
            <ArticlePreview
              title={title}
              excerpt={excerpt}
              tag={tag}
              body={body}
              image={featuredImage}
              minutes={minutes}
              products={selectedProducts}
            />
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="space-y-5">
          <Card title="Promotion checklist" aside={<span className="text-xs tabular-nums text-stone-400">{score}/{checklist.length}</span>}>
            <div className="h-1.5 rounded-full bg-stone-700 overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${score >= 7 ? 'bg-emerald-500' : score >= 4 ? 'bg-gold' : 'bg-red-500'}`}
                style={{ width: `${(score / checklist.length) * 100}%` }}
              />
            </div>
            <ul className="space-y-2">
              {checklist.map((c) => (
                <li key={c.label} className="flex gap-2 text-xs">
                  <span aria-hidden="true" className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${c.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-stone-700 text-stone-400'}`}>
                    {c.ok ? '✓' : '·'}
                  </span>
                  <span>
                    <span className={c.ok ? 'text-stone-300' : 'text-white font-medium'}>{c.label}</span>
                    {!c.ok && <span className="block text-stone-500 mt-0.5">{c.hint}</span>}
                    <span className="sr-only">{c.ok ? ' done' : ' to do'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Publishing">
            <div className="space-y-4">
              {published && (
                <Field id="post-date" label="Publish date" hint="Change to backdate a post. Newest posts show first.">
                  <input id="post-date" type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className={inputClass + ' [color-scheme:dark]'} />
                </Field>
              )}
              <Toggle
                checked={isFeatured}
                onChange={setIsFeatured}
                label="Feature at the top of the blog"
                hint="Takes the big hero spot on /blog. Only one post can be featured, so this replaces the current one."
              />
            </div>
          </Card>

          <Card title="Cover image">
            {featuredImage ? (
              <div className="space-y-2">
                <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden ring-1 ring-stone-600 bg-stone-800">
                  <Image src={featuredImage} alt="Cover preview" fill className="object-cover" sizes="340px" unoptimized />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-sm text-stone-300 hover:text-white transition-colors">
                    {uploading ? 'Uploading…' : 'Replace'}
                  </button>
                  <button type="button" onClick={() => setFeaturedImage(null)} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-[16/9] rounded-lg border-2 border-dashed border-stone-600 hover:border-gold text-stone-400 hover:text-white text-sm transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-60"
              >
                <span className="text-2xl leading-none" aria-hidden="true">+</span>
                {uploading ? 'Uploading…' : 'Upload a landscape photo'}
                <span className="text-xs text-stone-500">Used on cards, the post header and link previews</span>
              </button>
            )}
            {uploadError && <p className="mt-2 text-sm text-red-400">{uploadError}</p>}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </Card>

          <Card title="Category">
            <input
              type="text"
              list="blog-tags"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. Loc Care"
              aria-label="Category"
              className={inputClass}
            />
            <datalist id="blog-tags">
              {existingTags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {existingTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {existingTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors ${tag === t ? 'bg-gold text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title="Shop the look" aside={<span className="text-xs text-stone-500">{productIds.length}/{MAX_PRODUCTS}</span>}>
            <p className="text-xs text-stone-500 mb-3">Products shown at the end of the post with an add-to-cart link. Turns readers into buyers.</p>
            {selectedProducts.length > 0 && (
              <ul className="space-y-2 mb-3">
                {selectedProducts.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-lg bg-stone-900/60 ring-1 ring-stone-700 p-2">
                    <div className="relative w-10 h-10 rounded-md overflow-hidden bg-stone-700 shrink-0">
                      <Image src={p.image} alt="" fill className="object-cover" sizes="40px" unoptimized />
                    </div>
                    <span className="flex-1 min-w-0 text-sm text-stone-200 truncate">{p.name}</span>
                    <button type="button" onClick={() => setProductIds((ids) => ids.filter((x) => x !== p.id))} aria-label={`Remove ${p.name}`} className="p-1.5 text-stone-500 hover:text-red-300">
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {productIds.length < MAX_PRODUCTS && (
              <>
                <input type="search" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products…" aria-label="Search products to add" className={inputClass} />
                <ul className="mt-2 max-h-56 overflow-y-auto space-y-1">
                  {productMatches.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setProductIds((ids) => [...ids, p.id])
                          setProductQuery('')
                        }}
                        className="w-full flex items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-stone-700/60 transition-colors"
                      >
                        <div className="relative w-8 h-8 rounded overflow-hidden bg-stone-700 shrink-0">
                          <Image src={p.image} alt="" fill className="object-cover" sizes="32px" unoptimized />
                        </div>
                        <span className="flex-1 min-w-0 text-sm text-stone-300 truncate">{p.name}</span>
                        <span className="text-xs text-gold-light">+ Add</span>
                      </button>
                    </li>
                  ))}
                  {productMatches.length === 0 && <li className="px-2 py-1.5 text-xs text-stone-500">No matching products</li>}
                </ul>
              </>
            )}
          </Card>

          <Card title="Search & sharing">
            <div className="space-y-4">
              <Field id="post-slug" label="Web address">
                <div className="flex items-stretch rounded-lg ring-1 ring-stone-600 focus-within:ring-2 focus-within:ring-gold overflow-hidden">
                  <span className="px-2.5 flex items-center bg-stone-700 text-stone-400 text-xs">/blog/</span>
                  <input
                    id="post-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      setSlug(e.target.value)
                    }}
                    onBlur={() => setSlug((s) => slugify(s))}
                    placeholder="your-post"
                    className="flex-1 min-w-0 px-2.5 py-2 bg-stone-800 text-white placeholder-stone-500 text-sm focus:outline-none"
                  />
                </div>
                {isEdit && post?.published && slug !== post.slug && (
                  <p className="mt-1.5 text-xs text-amber-300">Changing the address of a live post breaks links already shared on WhatsApp/Instagram.</p>
                )}
              </Field>

              <Field id="seo-title" label="Google title" hint="Leave blank to use the post title." counter={{ value: (seoTitle || title).length + SITE_SUFFIX.length, ideal: [30, 65] }}>
                <input id="seo-title" type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title || 'Defaults to the post title'} className={inputClass} />
              </Field>

              <Field id="seo-desc" label="Google description" hint="Leave blank to use the teaser." counter={{ value: (seoDescription || excerpt).length, ideal: [70, 160] }}>
                <textarea id="seo-desc" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} placeholder={excerpt || 'Defaults to the teaser'} className={inputClass + ' resize-y'} />
              </Field>

              {/* Google result preview */}
              <div className="rounded-lg bg-white p-3">
                <p className="text-[11px] text-stone-500 mb-1">Google preview</p>
                <p className="text-xs text-[#202124] truncate">{SITE_HOST} &rsaquo; blog &rsaquo; {effectiveSlug}</p>
                <p className="text-[#1a0dab] text-base leading-snug line-clamp-1">{effectiveTitle}{SITE_SUFFIX}</p>
                <p className="text-xs text-[#4d5156] leading-snug line-clamp-2 mt-0.5">{effectiveDescription || 'Add a teaser so Google has something to show here.'}</p>
              </div>

              {/* WhatsApp / social card preview */}
              <div className="rounded-lg overflow-hidden ring-1 ring-stone-700 bg-[#1f2c33]">
                <p className="px-3 pt-2 text-[11px] text-stone-400">WhatsApp link preview</p>
                <div className="m-2 rounded-md overflow-hidden bg-[#0b141a]">
                  <div className="relative aspect-[1.91/1] bg-stone-800">
                    {featuredImage ? (
                      <Image src={featuredImage} alt="" fill className="object-cover" sizes="320px" unoptimized />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-500">Site default image</div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-sm text-white font-medium line-clamp-1">{effectiveTitle}</p>
                    <p className="text-xs text-stone-400 line-clamp-2">{effectiveDescription}</p>
                    <p className="text-[11px] text-stone-500 mt-1">{SITE_HOST}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {isEdit && (
            <div className="rounded-xl ring-1 ring-red-900/60 p-4">
              {showDeleteConfirm ? (
                <div className="space-y-3">
                  <p className="text-sm text-red-300">Delete this post permanently? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleDelete} disabled={isPending} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                      {isPending ? 'Deleting…' : 'Yes, delete'}
                    </button>
                    <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isPending} className="px-3 py-1.5 text-stone-400 hover:text-white text-sm transition-colors">
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={isPending} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                  Delete post
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </form>
  )
}

// ── Small building blocks ────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold'

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-stone-900 ring-1 ring-stone-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-sm font-semibold text-white">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Field({
  id,
  label,
  hint,
  counter,
  children,
}: {
  id: string
  label: string
  hint?: string
  counter?: { value: number; ideal: [number, number] }
  children: React.ReactNode
}) {
  const inRange = counter ? counter.value >= counter.ideal[0] && counter.value <= counter.ideal[1] : true
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-stone-300">{label}</label>
        {counter && (
          <span className={`text-xs tabular-nums ${counter.value === 0 ? 'text-stone-500' : inRange ? 'text-emerald-400' : 'text-amber-300'}`}>
            {counter.value}/{counter.ideal[1]}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <span className="relative mt-0.5 shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="block w-9 h-5 rounded-full bg-stone-600 peer-checked:bg-gold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold-light" />
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
      </span>
      <span>
        <span className="block text-sm text-stone-200">{label}</span>
        {hint && <span className="block text-xs text-stone-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

function StatusPill({ published, dirty }: { published: boolean; dirty: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className={`px-2 py-0.5 rounded-full font-medium ${published ? 'bg-emerald-900/60 text-emerald-300' : 'bg-stone-700 text-stone-300'}`}>
        {published ? 'Live' : 'Draft'}
      </span>
      {dirty && <span className="text-amber-300">Unsaved changes</span>}
    </span>
  )
}

/** Mirrors the public /blog/[slug] layout closely enough to judge the look before publishing. */
function ArticlePreview({
  title,
  excerpt,
  tag,
  body,
  image,
  minutes,
  products,
}: {
  title: string
  excerpt: string
  tag: string
  body: string
  image: string | null
  minutes: number
  products: PickerProduct[]
}) {
  return (
    <div className="rounded-xl overflow-hidden ring-1 ring-stone-700 bg-cream">
      <div className="bg-forest px-6 md:px-12 pt-10 pb-12 text-center">
        <p className="font-heading text-xs uppercase tracking-[0.2em] text-gold-light">
          {tag || 'Journal'} &middot; {minutes} min read
        </p>
        <h1 className="mt-4 font-heading text-3xl md:text-4xl font-bold text-cream leading-tight text-balance">
          {title || 'Your post title'}
        </h1>
        {excerpt && <p className="mt-4 max-w-xl mx-auto text-cream/75 leading-relaxed">{excerpt}</p>}
      </div>
      {image && (
        <div className="relative mx-auto -mt-6 w-[calc(100%-2rem)] max-w-3xl aspect-[16/9] rounded-2xl overflow-hidden shadow-xl">
          <Image src={image} alt="" fill className="object-cover" sizes="800px" unoptimized />
        </div>
      )}
      <div className="max-w-2xl mx-auto px-6 py-10">
        {body ? (
          <div className="tl-prose tl-prose--article" dangerouslySetInnerHTML={{ __html: body }} />
        ) : (
          <p className="text-charcoal/50 italic">Nothing written yet.</p>
        )}
      </div>
      {products.length > 0 && (
        <div className="bg-stone px-6 py-8">
          <p className="text-center font-heading text-xs uppercase tracking-[0.2em] text-gold-deep mb-4">Shop the look</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-xl overflow-hidden">
                <div className="relative aspect-square">
                  <Image src={p.image} alt="" fill className="object-cover" sizes="200px" unoptimized />
                </div>
                <p className="p-2 text-xs font-semibold text-forest truncate">{p.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
