'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'

interface ImageItem {
  id: string
  url: string
}

interface SortableThumbProps {
  item: ImageItem
  isPrimary: boolean
  onRemove: (id: string) => void
}

function SortableThumb({ item, isPrimary, onRemove }: SortableThumbProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative w-20 h-20 rounded-lg overflow-hidden cursor-grab border border-stone-600 select-none"
      {...attributes}
      {...listeners}
    >
      <Image
        src={item.url}
        alt="Product image"
        fill
        className="object-cover"
        sizes="80px"
        unoptimized
      />

      {/* Primary badge */}
      {isPrimary && (
        <span className="absolute bottom-0 left-0 right-0 bg-gold/90 text-white text-[10px] font-semibold text-center py-0.5 leading-tight">
          Primary
        </span>
      )}

      {/* Remove button — not draggable */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item.id)
        }}
        className="absolute top-0.5 right-0.5 w-5 h-5 bg-stone-900/80 hover:bg-red-700 rounded text-stone-300 hover:text-white flex items-center justify-center text-xs leading-none transition-colors"
        aria-label="Remove image"
      >
        ×
      </button>
    </div>
  )
}

interface ImageUploaderProps {
  productId: string | undefined
  initialImages: string[]
  onImagesChange: (urls: string[]) => void
}

export function ImageUploader({ productId, initialImages, onImagesChange }: ImageUploaderProps) {
  const [tempId] = useState(() => crypto.randomUUID())
  const [images, setImages] = useState<ImageItem[]>(() =>
    initialImages.map((url) => ({ id: crypto.randomUUID(), url }))
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor))

  // Notify parent whenever images change
  useEffect(() => {
    onImagesChange(images.map((i) => i.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images])

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null)
      const supabase = createClient()
      const effectiveProductId = productId ?? tempId
      const path = `${effectiveProductId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        return
      }

      const { data } = supabase.storage.from('product-images').getPublicUrl(path)

      setImages((prev) => [...prev, { id: crypto.randomUUID(), url: data.publicUrl }])
    },
    [productId, tempId]
  )

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    if (images.length >= 5) {
      setError('Maximum 5 images reached')
      return
    }

    setUploading(true)
    try {
      const filesToUpload = Array.from(files).slice(0, 5 - images.length)
      for (const file of filesToUpload) {
        if (images.length >= 5) break
        await uploadFile(file)
      }
    } finally {
      setUploading(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setImages((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id)
      const newIndex = prev.findIndex((i) => i.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  function handleRemove(id: string) {
    setImages((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed transition-colors ${
          images.length >= 5
            ? 'border-stone-700 bg-stone-800/40 cursor-not-allowed'
            : 'border-stone-600 bg-stone-800 cursor-pointer hover:border-gold/60 hover:bg-stone-700/60'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => {
          if (images.length < 5 && !uploading) {
            fileInputRef.current?.click()
          }
        }}
      >
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/60 rounded-lg z-10">
            <svg
              className="animate-spin h-6 w-6 text-gold"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}

        {/* Image icon */}
        <svg
          className="w-8 h-8 text-stone-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>

        <span className="text-sm text-stone-400">
          {images.length >= 5
            ? 'Maximum 5 images reached'
            : 'Drag images here or click to upload'}
        </span>
        <span className="text-xs text-stone-500">{images.length}/5 images</span>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Sortable thumbnails */}
      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {images.map((item, idx) => (
                <SortableThumb
                  key={item.id}
                  item={item}
                  isPrimary={idx === 0}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
