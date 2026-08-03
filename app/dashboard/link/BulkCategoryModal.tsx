'use client'

import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import { useLinkListContext } from './LinkListContext'

interface Props {
  onClose: () => void
}

export default function BulkCategoryModal({ onClose }: Props) {
  const { handleBulkRecategorize } = useLinkListContext()
  const { categories, loading } = useCategoryList()

  function handleSelect(categoryId: string | null) {
    handleBulkRecategorize(categoryId)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-surface-card shadow-xl ring-1 ring-surface-200 sm:rounded-2xl dark:bg-surface-900 dark:ring-surface-700">
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
        </div>

        <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4 dark:border-surface-800">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Set category</h2>
          <button
            onClick={onClose}
            className="text-sm font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
          >
            Cancel
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleSelect(cat.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-surface-700 transition hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
                >
                  {cat.emoticon && <span className="text-lg" aria-hidden="true">{cat.emoticon}</span>}
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
