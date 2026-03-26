'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface BlogCategoryFilterProps {
  tags: string[]
  activeTag: string | null
}

export function BlogCategoryFilter({ tags, activeTag }: BlogCategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleSelect(tag: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (tag) {
      params.set('category', tag)
    } else {
      params.delete('category')
    }
    router.push('/blog?' + params.toString())
  }

  const isAllActive = activeTag === null

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => handleSelect(null)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          isAllActive
            ? 'bg-[var(--color-gold,#C9A84C)] text-white'
            : 'bg-stone-100 text-charcoal hover:bg-stone-200'
        }`}
      >
        All
      </button>
      {tags.map((tag) => {
        const isActive = activeTag === tag
        return (
          <button
            key={tag}
            onClick={() => handleSelect(tag)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[var(--color-gold,#C9A84C)] text-white'
                : 'bg-stone-100 text-charcoal hover:bg-stone-200'
            }`}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}
