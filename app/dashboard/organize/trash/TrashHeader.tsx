'use client'

import { useState } from 'react'
import { useTrashContext } from './TrashContext'

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Trash</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {totalCount} deleted link{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      {totalCount > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {confirming ? (
            <>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmEmpty}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500"
              >
                Yes, delete all
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 dark:bg-slate-900 dark:border-red-900 dark:hover:bg-slate-800"
            >
              Empty Trash
            </button>
          )}
        </div>
      )}
    </div>
  )
}
