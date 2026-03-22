'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ProductImageGalleryProps {
  images: string[]
  alt: string
}

export function ProductImageGallery({ images, alt }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-stone">
        <Image
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          src={images[selectedIndex]}
          alt={alt}
          className="object-contain"
        />
      </div>

      {/* Thumbnail rail — only rendered when more than one image */}
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                idx === selectedIndex
                  ? 'ring-2 ring-gold'
                  : 'opacity-60 hover:opacity-100'
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <Image
                fill
                sizes="64px"
                src={src}
                alt={`${alt} thumbnail ${idx + 1}`}
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
