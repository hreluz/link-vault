'use client'

import { useState } from 'react'
import { useTrashContext } from './TrashContext'
import { TrashSolidIcon } from '@/components/icons'

export default function TrashHeader() {
  const { totalCount, handleEmptyTrash } = useTrashContext()
  const [confirming, setConfirming] = useState(false)

  async function onConfirmEmpty() {
    await handleEmptyTrash()
    setConfirming(false)
  }

  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Trash</h1>
        <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
          {totalCount} deleted link{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      {totalCount > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {confirming ? (
            <>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-xl border border-surface-200 bg-surface-card px-4 py-2 text-sm font-medium text-surface-500 shadow-sm transition hover:bg-surface-50 dark:bg-surface-800 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-700"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmEmpty}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600"
              >
                <TrashSolidIcon className="size-4" />
                Delete all
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-surface-card px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 dark:bg-surface-800 dark:border-red-800/60 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:border-red-700"
            >
              <TrashSolidIcon className="size-4" />
              Empty Trash
            </button>
          )}
        </div>
      )}
    </div>
  )
}
