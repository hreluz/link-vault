'use client'

import { useLinkListContext } from './LinkListContext'

export default function LinkListHeader() {
  const {
    totalCount, setModalOpen, isSelectionMode, selectedCount, enterSelectionMode, exitSelectionMode, favoritesOnly,
    refreshing, handleRefresh, lastMovedLink, undoingMove, handleUndoMove,
  } = useLinkListContext()

  if (isSelectionMode) {
    return (
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">
          {selectedCount} selected
        </p>
        <button
          onClick={exitSelectionMode}
          className="rounded-xl border border-surface-200 bg-surface-card px-4 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
          {favoritesOnly ? 'Favorites' : 'Your Links'}
        </h1>
        <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
          {totalCount} link{totalCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {lastMovedLink && (
          <button
            onClick={handleUndoMove}
            disabled={undoingMove}
            aria-label="Undo last move"
            title={`Move ${lastMovedLink.title || lastMovedLink.url} back`}
            className="flex items-center gap-1.5 rounded-xl border border-surface-200 bg-surface-card px-3 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M7.5 5 4 8.5 7.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 8.5h7.5a4.5 4.5 0 0 1 0 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Undo
          </button>
        )}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-busy={refreshing}
          aria-label="Refresh links"
          title="Refresh links"
          className="rounded-xl border border-surface-200 bg-surface-card px-2.5 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
        >
          <svg
            className={`h-5 w-5${refreshing ? ' animate-spin' : ''}`}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path d="M16 10a6 6 0 1 1-1.76-4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 3.5v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={enterSelectionMode}
          aria-label="Select links"
          className="rounded-xl border border-surface-200 bg-surface-card px-3 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
        >
          Select
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
        >
          + Add link
        </button>
      </div>
    </div>
  )
}
