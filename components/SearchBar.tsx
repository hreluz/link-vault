'use client'

import { useSearchTagSuggestions } from '@/lib/hooks/tags/useSearchTagSuggestions'
import TagSuggestionsDropdown from './TagSuggestionsDropdown'

interface Props {
  value: string
  onChange: (q: string) => void
  isHashTagSearch?: boolean
  filterCount?: number
  onFilterOpen?: () => void
  availableTags?: string[]
}

export default function SearchBar({ value, onChange, isHashTagSearch = false, filterCount, onFilterOpen, availableTags = [] }: Props) {
  const { suggestions, selectedIndex, onKeyPress, selectSuggestion, closeSuggestions } =
    useSearchTagSuggestions(value, onChange, availableTags)

  return (
    <div className="mb-4 flex gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" aria-hidden="true">
          🔍
        </span>
        <input
          type="search"
          placeholder="Search by title, domain, tag… or #tag for tag-only"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (onKeyPress(e.key)) e.preventDefault()
          }}
          onBlur={closeSuggestions}
          className={`w-full rounded-xl border bg-surface-card py-3 pl-11 pr-4 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:ring-2 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500 ${
            isHashTagSearch
              ? 'border-primary-400 focus:border-primary-500 focus:ring-primary-500/20 ring-1 ring-primary-300 dark:border-primary-500'
              : 'border-surface-200 focus:border-primary-500 focus:ring-primary-500/20 dark:border-surface-700'
          }`}
        />
        <TagSuggestionsDropdown suggestions={suggestions} selectedIndex={selectedIndex} onSelect={selectSuggestion} />
      </div>
      {onFilterOpen !== undefined && (
        <button
          onClick={onFilterOpen}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
            (filterCount ?? 0) > 0
              ? 'bg-primary-50 text-primary-600 ring-1 ring-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:ring-primary-800'
              : 'border border-surface-200 bg-surface-card text-surface-600 shadow-sm hover:bg-surface-50 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100'
          }`}
        >
          <span aria-hidden="true">⚡</span>
          Filters{(filterCount ?? 0) > 0 ? ` · ${filterCount}` : ''}
        </button>
      )}
    </div>
  )
}
