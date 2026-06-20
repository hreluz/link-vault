'use client'

import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { useLinkListContext } from './LinkListContext'
import LinkCard from './LinkCard'

export default function LinkGrid() {
  const {
    loading, results, hasActiveFilters,
    setActiveLink, handleFavoriteToggle, handleLinkOpen, handleDeleteById, resetFilters,
    isSelectionMode, isSelected, toggleSelected, enterSelectionMode,
  } = useLinkListContext()
  const { categories } = useCategoryList()

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-4xl" aria-hidden="true">📭</div>
        <p className="text-slate-500">No links match the current filters.</p>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Clear filters
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.map(link => (
        <LinkCard
          key={link.id}
          link={link}
          category={categories.find(c => c.id === link.category_id) ?? null}
          onMenuOpen={() => setActiveLink(link)}
          onFavoriteToggle={() => handleFavoriteToggle(link.id)}
          onOpen={() => handleLinkOpen(link.id, link.status)}
          onDelete={() => handleDeleteById(link.id)}
          isSelectionMode={isSelectionMode}
          isSelected={isSelected(link.id)}
          onSelect={toggleSelected}
          onLongPress={(id) => { enterSelectionMode(); toggleSelected(id) }}
        />
      ))}
    </div>
  )
}
