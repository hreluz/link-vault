'use client'

import { useState } from 'react'
import type { LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '../config'

const STATUS_ICONS: Record<LinkStatus, string> = {
  unread:   '📥',
  watching: '👀',
  read:     '✅',
  archived: '🗄️',
}

interface Props {
  link: LinkWithTags | null
  onStatusChange: (id: string, status: LinkStatus) => void
  onFavoriteToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export default function BottomSheet({ link, onStatusChange, onFavoriteToggle, onEdit, onDelete, onClose }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!link) return null

  function handleClose() {
    setConfirmingDelete(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40 lg:backdrop-blur-sm" />

      <div
        className="relative w-full rounded-t-2xl bg-white lg:max-w-sm lg:rounded-2xl lg:shadow-2xl lg:max-h-[90vh] lg:overflow-y-auto dark:bg-slate-900"
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle - mobile only */}
        <div className="flex justify-center pb-1 pt-3 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* header */}
        <div className="flex items-start gap-2 border-b border-slate-100 px-5 py-3 lg:py-4 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-50">{link.title}</p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{link.site_name}</p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 lg:flex dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        {/* quick actions */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClose}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">↗</span> Open
          </a>
          <button
            onClick={() => { onEdit(); handleClose() }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">✏️</span> Edit
          </button>
          <button
            onClick={() => { onFavoriteToggle(); handleClose() }}
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition ${
              link.is_favorite
                ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <span aria-hidden="true">{link.is_favorite ? '⭐' : '☆'}</span>
            {link.is_favorite ? 'Unstar' : 'Star'}
          </button>
        </div>

        {/* status options */}
        <ul className="py-2">
          <li className="px-5 pb-1 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Status</p>
          </li>
          {(Object.keys(STATUS_CONFIG) as LinkStatus[]).map(s => {
            const active = link.status === s
            return (
              <li key={s}>
                <button
                  onClick={() => { onStatusChange(link.id, s); handleClose() }}
                  className={`flex w-full items-center gap-4 px-5 py-3.5 text-left transition active:bg-slate-100 dark:active:bg-slate-800 ${
                    active ? 'bg-slate-50 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-lg" aria-hidden="true">{STATUS_ICONS[s]}</span>
                  <span className={`text-sm font-medium ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {STATUS_CONFIG[s].label}
                  </span>
                  {active && <span className="ml-auto text-sm font-semibold text-indigo-600 dark:text-indigo-400">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>

        {/* delete */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          {confirmingDelete ? (
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm text-slate-600 dark:text-slate-400">Delete this link?</p>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(); handleClose() }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <span aria-hidden="true">🗑️</span> Delete link
            </button>
          )}
        </div>

        <div className="h-6 lg:hidden" />
      </div>
    </div>
  )
}
