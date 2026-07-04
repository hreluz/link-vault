'use client'

import { useLinkListContext } from './LinkListContext'

export default function LinkListHeader() {
  const { totalCount, setModalOpen, isSelectionMode, selectedCount, enterSelectionMode, exitSelectionMode, favoritesOnly } = useLinkListContext()

  if (isSelectionMode) {
    return (
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {selectedCount} selected
        </p>
        <button
          onClick={exitSelectionMode}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {favoritesOnly ? 'Favorites' : 'Your Links'}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {totalCount} link{totalCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={enterSelectionMode}
          aria-label="Select links"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Select
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          + Add link
        </button>
      </div>
    </div>
  )
}
