'use client'

import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { useInfiniteScrollSentinel } from '@/lib/hooks/shared/useInfiniteScrollSentinel'
import { useReturnPulse } from '@/lib/hooks/shared/useReturnPulse'
import { useLinkListContext } from './LinkListContext'
import LinkCard from './LinkCard'

export default function LinkGrid() {
  const {
    loading, links: results, hasActiveFilters, favoritesOnly,
    hasMore, loadingMore, loadMore, refreshKey,
    setActiveLink, handleFavoriteToggle, handleLinkOpen, lastOpenedId, handleDeleteById, resetFilters,
    isSelectionMode, isSelected, toggleSelected, enterSelectionMode,
  } = useLinkListContext()
  const { categories } = useCategoryList(refreshKey)
  const sentinelRef = useInfiniteScrollSentinel(loadMore, hasMore && !loading && !loadingMore)
  const pulse = useReturnPulse(lastOpenedId !== null)

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface-100" />
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    if (favoritesOnly) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">⭐</div>
          <p className="text-surface-500">
            {hasActiveFilters ? 'No favorites match your search.' : 'No favorites yet. Star a link to see it here — favorited links are also protected from deletion.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Clear filters
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-4xl" aria-hidden="true">📭</div>
        <p className="text-surface-500">No links match the current filters.</p>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            Clear filters
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map(link => (
          <LinkCard
            key={link.id}
            link={link}
            category={categories.find(c => c.id === link.category_id) ?? null}
            onMenuOpen={() => setActiveLink(link)}
            onFavoriteToggle={() => handleFavoriteToggle(link.id)}
            onOpen={() => handleLinkOpen(link.id, link.status)}
            isLastOpened={link.id === lastOpenedId}
            pulse={pulse && link.id === lastOpenedId}
            onDelete={() => handleDeleteById(link.id)}
            isSelectionMode={isSelectionMode}
            isSelected={isSelected(link.id)}
            onSelect={toggleSelected}
            onLongPress={(id) => { enterSelectionMode(); toggleSelected(id) }}
          />
        ))}
        {loadingMore && Array.from({ length: 3 }).map((_, i) => (
          <div key={`loading-more-${i}`} className="h-48 animate-pulse rounded-2xl bg-surface-100" />
        ))}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </>
  )
}
