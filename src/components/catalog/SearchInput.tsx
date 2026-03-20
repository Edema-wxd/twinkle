'use client'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search products\u2026',
}: SearchInputProps) {
  return (
    <div className="relative flex-1 min-w-0">
      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-charcoal/40">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full font-body text-sm bg-stone border border-charcoal/20 rounded-lg pl-9 pr-4 py-2 text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
    </div>
  )
}
