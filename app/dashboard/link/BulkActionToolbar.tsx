'use client'

import { useState } from 'react'
import { useLinkListContext } from './LinkListContext'
import BulkCategoryModal from './BulkCategoryModal'
import BulkTagModal from './BulkTagModal'
import BulkDeleteModal from './BulkDeleteModal'

export default function BulkActionToolbar() {
  const {
    isSelectionMode, selectedCount, selectedIds,
    selectAll, clearAll, results,
    handleBulkArchive,
  } = useLinkListContext()

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [tagModalOpen, setTagModalOpen] = useState(false)

  if (!isSelectionMode) return null

  const allResultIds = results.map(l => l.id)
  const allSelected = allResultIds.length > 0 && allResultIds.every(id => selectedIds.has(id))

  function handleSelectAll() {
    if (allSelected) clearAll()
    else selectAll(allResultIds)
  }

  return (
    <>
      <div className="sticky top-0 z-10 mb-4 -mx-4 px-4 py-3 bg-white/95 backdrop-blur dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={handleSelectAll}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>

          <div className="h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

          <button
            onClick={handleBulkArchive}
            disabled={selectedCount === 0}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            🗄️ Archive
          </button>

          <button
            onClick={() => setCategoryModalOpen(true)}
            disabled={selectedCount === 0}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            📁 Category
          </button>

          <button
            onClick={() => setTagModalOpen(true)}
            disabled={selectedCount === 0}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            🏷️ Add tags
          </button>

          <button
            onClick={() => setDeleteModalOpen(true)}
            disabled={selectedCount === 0}
            className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:bg-slate-900 dark:hover:bg-red-950"
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
