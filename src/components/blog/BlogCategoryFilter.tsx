import Link from 'next/link'

interface BlogCategoryFilterProps {
  tags: string[]
  activeTag: string | null
}

/** Crawlable category links (plain anchors, no client JS). */
export function BlogCategoryFilter({ tags, activeTag }: BlogCategoryFilterProps) {
  if (tags.length === 0) return null

  const items = [{ label: 'All stories', tag: null as string | null }, ...tags.map((t) => ({ label: t, tag: t }))]

  return (
    <nav aria-label="Blog categories" className="-mx-4 px-4 overflow-x-auto [scrollbar-width:none]">
      <ul className="flex w-max gap-2">
        {items.map(({ label, tag }) => {
          const active = tag === activeTag
          return (
            <li key={label}>
              <Link
                href={tag ? `/blog?category=${encodeURIComponent(tag)}` : '/blog'}
                aria-current={active ? 'page' : undefined}
                scroll={false}
                className={`inline-flex min-h-10 items-center rounded-full px-4 font-heading text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
                  active
                    ? 'bg-forest text-cream'
                    : 'bg-white/70 text-forest ring-1 ring-forest/15 hover:ring-forest/40'
                }`}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
