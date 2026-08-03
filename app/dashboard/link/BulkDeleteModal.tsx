'use client'

import { useLinkListContext } from './LinkListContext'

interface Props {
  onClose: () => void
}

export default function BulkDeleteModal({ onClose }: Props) {
  const { selectedCount, handleBulkDeleteSelected } = useLinkListContext()

  function handleConfirm() {
    handleBulkDeleteSelected()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-t-2xl bg-surface-card shadow-xl ring-1 ring-surface-200 sm:rounded-2xl dark:bg-surface-900 dark:ring-surface-700">
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
        </div>

        <div className="p-6">
          <div className="mb-1 text-3xl">🗑️</div>
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            Delete {selectedCount} link{selectedCount !== 1 ? 's' : ''}?
          </h2>
          <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
            These links will be moved to trash. You can restore them from the Organize section.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-surface-200 bg-surface-card px-4 py-2.5 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
