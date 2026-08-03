'use client'

import { useState } from 'react'
import { useLinkListContext } from './LinkListContext'
import BulkCategoryModal from './BulkCategoryModal'
import BulkTagModal from './BulkTagModal'
import BulkDeleteModal from './BulkDeleteModal'

export default function BulkActionToolbar() {
  const {
    isSelectionMode, selectedCount,
    clearAll, totalCount, selectingAllMatching, handleSelectAllMatching,
    handleBulkArchive,
  } = useLinkListContext()

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [tagModalOpen, setTagModalOpen] = useState(false)

  if (!isSelectionMode) return null

  const allSelected = totalCount > 0 && selectedCount === totalCount

  function handleSelectAll() {
    if (allSelected) clearAll()
    else handleSelectAllMatching()
  }

  return (
    <>
      <div className="sticky top-0 z-10 mb-4 -mx-4 px-4 py-3 bg-surface-card/95 backdrop-blur dark:bg-surface-950/95 border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={handleSelectAll}
            disabled={selectingAllMatching}
            className="shrink-0 rounded-lg border border-surface-200 bg-surface-card px-3 py-1.5 text-xs font-medium text-surface-600 transition hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
          >
            {allSelected ? 'Deselect all' : selectingAllMatching ? 'Selecting…' : `Select all ${totalCount}`}
          </button>

          <div className="h-4 w-px shrink-0 bg-surface-200 dark:bg-surface-700" />

          <button
            onClick={handleBulkArchive}
            disabled={selectedCount === 0}
            className="shrink-0 rounded-lg border border-surface-200 bg-surface-card px-3 py-1.5 text-xs font-medium text-surface-600 transition hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
          >
            🗄️ Archive
          </button>

          <button
            onClick={() => setCategoryModalOpen(true)}
            disabled={selectedCount === 0}
            className="shrink-0 rounded-lg border border-surface-200 bg-surface-card px-3 py-1.5 text-xs font-medium text-surface-600 transition hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
          >
            📁 Category
          </button>

          <button
            onClick={() => setTagModalOpen(true)}
            disabled={selectedCount === 0}
            className="shrink-0 rounded-lg border border-surface-200 bg-surface-card px-3 py-1.5 text-xs font-medium text-surface-600 transition hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
          >
            🏷️ Add tags
          </button>

          <button
            onClick={() => setDeleteModalOpen(true)}
            disabled={selectedCount === 0}
            className="shrink-0 rounded-lg border border-red-200 bg-surface-card px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:bg-surface-900 dark:hover:bg-red-950"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {deleteModalOpen && <BulkDeleteModal onClose={() => setDeleteModalOpen(false)} />}
      {categoryModalOpen && <BulkCategoryModal onClose={() => setCategoryModalOpen(false)} />}
      {tagModalOpen && <BulkTagModal onClose={() => setTagModalOpen(false)} />}
    </>
  )
}
