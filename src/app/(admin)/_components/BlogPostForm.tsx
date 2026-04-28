'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { RichTextEditor } from './RichTextEditor'
import { useUploadThing } from '@/lib/uploadthing'
import type { BlogPost } from '@/types/db'

interface BlogPostFormProps {
  post?: BlogPost
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function BlogPostForm({ post }: BlogPostFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isEdit = !!post

  const [title, setTitle] = useState(post?.title ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [featuredImage, setFeaturedImage] = useState<string | null>(post?.featured_image ?? null)
  const [tag, setTag] = useState(post?.tag ?? '')
  const [published, setPublished] = useState(post?.published ?? false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload } = useUploadThing('contentImages', {
    onClientUploadComplete: (res) => {
      if (res?.[0]) setFeaturedImage(res[0].ufsUrl)
    },
    onUploadError: (err) => {
      setUploadError(`Upload failed: ${err.message}`)
    },
  })

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  // Auto-generate slug from title on blur (only if slug is empty and not in edit mode)
  function handleTitleBlur() {
    if (!isEdit && slug === '' && title.trim() !== '') {
      setSlug(generateSlug(title.trim()))
    }
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
      // Reset input so same file can be re-selected if removed then re-added
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (title.trim() === '') {
      showToast('error', 'Title is required')
      return
    }
    if (slug.trim() === '') {
      showToast('error', 'Slug is required')
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          slug: slug.trim(),
          excerpt,
          body,
          featured_image: featuredImage,
          tag: tag.trim() || null,
          published,
        }

        const url = isEdit ? `/api/admin/blog/${post.id}` : '/api/admin/blog'
        const method = isEdit ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to save post')
          return
        }

        showToast('success', isEdit ? 'Post updated' : 'Post created')
        if (!isEdit) {
          setTimeout(() => {
            router.push('/admin/blog')
          }, 400)
        }
      } catch {
        showToast('error', 'Network error — please try again')
      }
    })
  }

  function handleDelete() {
    if (!post) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/blog/${post.id}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Failed to delete post')
          setShowDeleteConfirm(false)
          return
        }

        router.push('/admin/blog')
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

      {/* Title */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          required
          placeholder="e.g. How to care for your loc beads"
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Slug <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="used-in-url"
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
        <p className="text-xs text-stone-500">Used in the post URL: /blog/[slug]</p>
      </div>

      {/* Excerpt */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Excerpt
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={3}
          placeholder="1–3 sentences shown on the blog listing page..."
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-y"
        />
      </div>

      {/* Tag */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Tag
        </label>
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="e.g. Hair Care, Tutorials, Brand Story"
          className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        />
        <p className="text-xs text-stone-500">Freeform tag shown on blog cards and the post page.</p>
      </div>

      {/* Featured image */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stone-300">
          Featured image
        </label>

        {featuredImage ? (
          <div className="space-y-2">
            <div className="relative w-40 h-28 rounded-lg overflow-hidden border border-stone-600 bg-stone-800">
              <Image
                src={featuredImage}
                alt="Featured image preview"
                fill
                className="object-cover"
                sizes="160px"
                unoptimized
              />
            </div>
            <button
              type="button"
              onClick={() => setFeaturedImage(null)}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Remove image
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-300 text-sm rounded-lg border border-stone-600 transition-colors"
            >
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
            {uploadError && (
              <p className="mt-1.5 text-sm text-red-400">{uploadError}</p>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-300">
          Body
        </label>
        <RichTextEditor value={body} onChange={setBody} />
      </div>

      {/* Published toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="w-4 h-4 accent-gold"
          />
          <span className="text-sm text-stone-300">Publish post (visible on blog)</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-gold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? 'Saving…' : isEdit ? 'Save post' : 'Create post'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/blog')}
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
                Delete post
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  )
}
