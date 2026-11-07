'use client'

import { useId } from 'react'
import { useSearchTagSuggestions } from '@/lib/hooks/tags/useSearchTagSuggestions'
import { useMediaQuery } from '@/lib/hooks/shared/useMediaQuery'
import TagSuggestionsDropdown from './TagSuggestionsDropdown'
import { FilterIcon, SearchIcon } from '@/components/icons'

interface Props {
  value: string
  onChange: (q: string) => void
  isHashTagSearch?: boolean
  filterCount?: number
  onFilterOpen?: () => void
  /** Whether the sheet opened by Filters is showing (drives aria-expanded). */
  filterOpen?: boolean
  availableTags?: string[]
}

export default function SearchBar({ value, onChange, isHashTagSearch = false, filterCount, onFilterOpen, filterOpen = false, availableTags = [] }: Props) {
  const { suggestions, selectedIndex, onKeyPress, selectSuggestion, closeSuggestions } =
    useSearchTagSuggestions(value, onChange, availableTags)
  const inputId = useId()
  // The full placeholder is cut off on phones, so they get a short one (SPEC 38).
  const isSmUp = useMediaQuery('(min-width: 640px)')

  return (
    <div className="mb-4 flex gap-2">
      <div className="relative flex-1">
        <label htmlFor={inputId} className="sr-only">Search links</label>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
        <input
          id={inputId}
          type="search"
          placeholder={isSmUp ? 'Search by title, domain, tag… or #tag for tag-only' : 'Search or #tag'}
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
          aria-haspopup="dialog"
          aria-expanded={filterOpen}
          className={`focus-ring flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
            (filterCount ?? 0) > 0
              ? 'bg-primary-50 text-primary-600 ring-1 ring-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:ring-primary-800'
              : 'border border-surface-200 bg-surface-card text-surface-600 shadow-sm hover:bg-surface-50 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100'
          }`}
        >
          <FilterIcon className="h-5 w-5" />
          Filters{(filterCount ?? 0) > 0 ? ` · ${filterCount}` : ''}
        </button>
      )}
    </div>
  )
}
