'use client'

import type { SortBy } from './FilterSheet'
import { useLinkListContext } from './LinkListContext'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { useAvailableTagsWithIds } from '@/lib/hooks/tags/useAvailableTags'

const SORT_LABELS: Record<SortBy, string> = {
  newest: 'Newest first', oldest: 'Oldest first', alphabetical: 'A → Z', status: 'By status',
}

export default function ActiveFilterChips() {
  const {
    sortBy, setSortBy,
    category, setCategory,
    selectedTagIds, setSelectedTagIds,
    resetFilters,
  } = useLinkListContext()
  const { categories } = useCategoryList()
  const availableTags = useAvailableTagsWithIds()
  const activeCategory = categories.find(c => c.id === category)

  const hasChips = sortBy !== 'newest' || category !== 'all' || selectedTagIds.length > 0
  if (!hasChips) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {sortBy !== 'newest' && (
        <button
          onClick={() => setSortBy('newest')}
          className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
        >
          {SORT_LABELS[sortBy]}
          <span className="text-indigo-400" aria-hidden="true">✕</span>
        </button>
      )}
      {category !== 'all' && activeCategory && (
        <button
          onClick={() => setCategory('all')}
          className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
        >
          {activeCategory.emoticon} {activeCategory.name}
          <span className="text-indigo-400" aria-hidden="true">✕</span>
        </button>
      )}
      {selectedTagIds.map(tagId => (
        <button
          key={tagId}
          onClick={() => setSelectedTagIds(prev => prev.filter(id => id !== tagId))}
          className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
        >
          {availableTags.find(t => t.id === tagId)?.name ?? tagId}
          <span className="text-indigo-400" aria-hidden="true">✕</span>
        </button>
      ))}
      <button
        onClick={resetFilters}
        className="text-sm text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        Clear all
      </button>
    </div>
  )
}
