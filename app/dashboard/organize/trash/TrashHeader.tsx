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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden="true">
                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                </svg>
                Delete all
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-surface-card px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 dark:bg-surface-800 dark:border-red-800/60 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:border-red-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden="true">
                <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
              </svg>
              Empty Trash
            </button>
          )}
        </div>
      )}
    </div>
  )
}
