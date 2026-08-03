'use client'

interface Props {
  suggestions: string[]
  selectedIndex: number
  onSelect: (tag: string) => void
}

export default function TagSuggestionsDropdown({ suggestions, selectedIndex, onSelect }: Props) {
  if (suggestions.length === 0) return null

  return (
    <ul className="absolute z-10 mt-1 w-full rounded-xl border border-surface-200 bg-surface-card shadow-lg overflow-hidden dark:border-surface-700 dark:bg-surface-900">
      {suggestions.map((tag, i) => (
        <li
          key={tag}
          onMouseDown={e => { e.preventDefault(); onSelect(tag) }}
          className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
            i === selectedIndex
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800'
          }`}
        >
          #{tag}
        </li>
      ))}
    </ul>
  )
}
