'use client'

import { STATUS_CONFIG } from '../config'
import type { SortBy } from './FilterSheet'
import { useLinkListContext } from './LinkListContext'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'

const SORT_LABELS: Record<SortBy, string> = {
  newest: 'Newest first', oldest: 'Oldest first', alphabetical: 'A → Z', status: 'By status',
}

export default function ActiveFilterChips() {
  const {
    hasActiveFilters,
    sortBy, setSortBy,
    category, setCategory,
    selectedStatuses, setSelectedStatuses,
    selectedTags, setSelectedTags,
    resetFilters,
  } = useLinkListContext()
  const { categories } = useCategoryList()
  const activeCategory = categories.find(c => c.id === category)

  if (!hasActiveFilters) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {sortBy !== 'newest' && (
        <button
          onClick={() => setSortBy('newest')}
          className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200"
        >
          {SORT_LABELS[sortBy]}
          <span className="text-indigo-400" aria-hidden="true">✕</span>
        </button>
      )}
      {category !== 'all' && activeCategory && (
        <button
          onClick={() => setCategory('all')}
          className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200"
        >
          {activeCategory.emoticon} {activeCategory.name}
          <span className="text-indigo-400" aria-hidden="true">✕</span>
        </button>
      )}
      {selectedStatuses.map(s => (
        <button
          key={s}
          onClick={() => setSelectedStatuses(prev => prev.filter(x => x !== s))}
          className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200"
        >
          {STATUS_CONFIG[s].label}
          <span className="text-indigo-400" aria-hidden="true">✕</span>
        </button>
      ))}
      {selectedTags.map(tag => (
        <button
          key={tag}
          onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
          className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200"
        >
          {tag}
          <span className="text-indigo-400" aria-hidden="true">✕</span>
        </button>
      ))}
      <button
        onClick={resetFilters}
        className="text-sm text-slate-400 transition hover:text-slate-600"
      >
        Clear all
      </button>
    </div>
  )
}
