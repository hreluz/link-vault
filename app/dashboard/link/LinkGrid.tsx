'use client'

import { useEffect } from 'react'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { useInfiniteScrollSentinel } from '@/lib/hooks/shared/useInfiniteScrollSentinel'
import { useReturnPulse } from '@/lib/hooks/shared/useReturnPulse'
import { useLinkListContext } from './LinkListContext'
import LinkCard from './LinkCard'

const RESTORED_PULSE_MS = 1500

// Fully visible between the bottom of the sticky DashboardHeader and the bottom of the viewport.
function isCardFullyVisible(card: Element) {
  const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0
  const rect = card.getBoundingClientRect()
  return rect.top >= headerBottom && rect.bottom <= window.innerHeight
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function LinkGrid() {
  const {
    loading, links: results, hasActiveFilters, favoritesOnly,
    hasMore, loadingMore, loadMore, loadError, retryLoad, refreshKey,
    activeLink, setActiveLink, setEditingLink, handleFavoriteToggle, handleLinkOpen, handleSendToEnd, lastOpenedId, handleDeleteById, resetFilters,
    imageStateById, handleImageError, restoredLinkId, clearRestoredLink,
  } = useLinkListContext()
  const { categories } = useCategoryList(refreshKey)
  // After a failed page the sentinel is replaced by Try again, so it stops firing until a retry.
  const sentinelRef = useInfiniteScrollSentinel(loadMore, hasMore && !loading && !loadingMore && loadError === null)
  const returnPulse = useReturnPulse(lastOpenedId !== null)

  // After a saved undo: bring the restored card into view if it's off-screen,
  // hand it focus (the Undo button that had it is gone), and pulse it while
  // restoredLinkId stays set -- cleared after RESTORED_PULSE_MS (SPEC 36).
  useEffect(() => {
    if (!restoredLinkId) return
    const card = Array.from(document.querySelectorAll('[data-link-id]'))
      .find(el => el.getAttribute('data-link-id') === restoredLinkId)
    if (!card) {
      clearRestoredLink()
      return
    }
    if (!isCardFullyVisible(card)) {
      card.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
    card.querySelector<HTMLElement>('a[data-card-title]')?.focus({ preventScroll: true })
    const timer = setTimeout(clearRestoredLink, RESTORED_PULSE_MS)
    return () => clearTimeout(timer)
  }, [restoredLinkId, clearRestoredLink])

  // The first page failed: nothing to show, so no skeletons and no "no links" empty state.
  if (loadError === 'load') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          Couldn&apos;t load your links.
        </p>
        <button
          type="button"
          onClick={retryLoad}
          className="mt-4 focus-ring rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Try again
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface-100" />
        ))}
      </div>
    )
  }

  // Moved links are held back while pages remain, so an empty list can still
  // have more to load -- keep the sentinel instead of the empty state.
  if (results.length === 0 && !hasMore) {
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
              className="focus-ring mt-1 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-primary-600 hover:text-primary-500"
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
            className="focus-ring mt-1 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-primary-600 hover:text-primary-500"
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
            isMenuOpen={activeLink?.id === link.id}
            onFavoriteToggle={() => handleFavoriteToggle(link.id)}
            onEdit={() => setEditingLink(link)}
            onOpen={() => handleLinkOpen(link.id, link.status)}
            onSendToEnd={() => handleSendToEnd(link.id)}
            isLastOpened={link.id === lastOpenedId}
            pulse={(returnPulse && link.id === lastOpenedId) || link.id === restoredLinkId}
            imageState={imageStateById[link.id]}
            onImageError={() => handleImageError(link.id)}
            onDelete={() => handleDeleteById(link.id)}
          />
        ))}
        {loadingMore && Array.from({ length: 3 }).map((_, i) => (
          <div key={`loading-more-${i}`} className="h-48 animate-pulse rounded-2xl bg-surface-100" />
        ))}
      </div>
      {loadError === 'loadMore' ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Couldn&apos;t load more links.
          </p>
          <button
            type="button"
            onClick={retryLoad}
            className="focus-ring rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Try again
          </button>
        </div>
      ) : (
        hasMore && <div ref={sentinelRef} className="h-1" />
      )}
    </>
  )
}
