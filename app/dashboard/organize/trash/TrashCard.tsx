'use client'

import { useState } from 'react'
import SwipeableCard from '@/components/SwipeableCard'
import type { TrashedLink } from '@/lib/services/trash'

interface Props {
  link: TrashedLink
  onRestore: () => void
  onDeletePermanently: () => void
}

export default function TrashCard({ link, onRestore, onDeletePermanently }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const deletedDate = link.deleted_at
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(link.deleted_at))
    : null

  return (
    <SwipeableCard onSwipeDelete={onDeletePermanently}>
      <article className="flex flex-col gap-3 bg-white p-5 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            {link.site_name ?? 'Unknown site'}
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            {confirmingDelete ? (
              <>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  aria-label="Cancel delete"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={onDeletePermanently}
                  aria-label="Confirm permanent delete"
                  className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
                    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                  </svg>
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Delete link permanently"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden="true">
                    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={onRestore}
                  aria-label="Restore link"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-300 dark:bg-slate-800 dark:border-slate-600 dark:text-indigo-400 dark:hover:bg-indigo-900/30 dark:hover:border-indigo-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
                    <path fillRule="evenodd" d="M14 8a6 6 0 0 1-9.84 4.605L12 4.697A5.979 5.979 0 0 1 14 8Zm-2.16-5.395L4 10.303A6 6 0 0 1 12 2.605ZM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Z" clipRule="evenodd" />
                  </svg>
                  Restore
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <h3 className="line-clamp-2 font-semibold leading-snug text-slate-500 dark:text-slate-400">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-600 focus-visible:outline-none focus-visible:text-indigo-600"
            >
              {link.title ?? link.url}
            </a>
          </h3>
          {link.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-400 dark:text-slate-500">{link.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {link.tags.map(tag => (
            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              {tag}
            </span>
          ))}
          {deletedDate && (
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
              Deleted {deletedDate}
            </span>
          )}
        </div>
      </article>
    </SwipeableCard>
  )
}
