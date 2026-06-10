'use client'

import { useState } from 'react'
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
    <article className="flex flex-col gap-3 rounded-2xl bg-white p-5 opacity-80 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          {link.site_name ?? 'Unknown site'}
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          {confirmingDelete ? (
            <>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={onDeletePermanently}
                className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
              >
                Yes, delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50 hover:border-red-200 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Delete forever
              </button>
              <button
                onClick={onRestore}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Restore
              </button>
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="line-clamp-2 font-semibold leading-snug text-slate-700 dark:text-slate-300">
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
  )
}
