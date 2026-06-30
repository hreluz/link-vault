'use client'

interface Props {
  suggestions: string[]
  selectedIndex: number
  onSelect: (tag: string) => void
}

export default function TagSuggestionsDropdown({ suggestions, selectedIndex, onSelect }: Props) {
  if (suggestions.length === 0) return null

  return (
    <ul className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden dark:border-slate-700 dark:bg-slate-900">
      {suggestions.map((tag, i) => (
        <li
          key={tag}
          onMouseDown={e => { e.preventDefault(); onSelect(tag) }}
          className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
            i === selectedIndex
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
              : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          #{tag}
        </li>
      ))}
    </ul>
  )
}
