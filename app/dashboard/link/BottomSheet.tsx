'use client'

import { useState } from 'react'
import type { LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'
import { useBackdropClose } from '@/lib/hooks/shared/useBackdropClose'
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
  onDelete: () => void
  onClose: () => void
}

export default function BottomSheet({ link, onStatusChange, onDelete, onClose }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function handleClose() {
    setConfirmingDelete(false)
    onClose()
  }

  const backdrop = useBackdropClose(handleClose)

  if (!link) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center" {...backdrop}>
      <div className="pointer-events-none absolute inset-0 bg-black/40 lg:backdrop-blur-sm" />

      <div className="relative w-full rounded-t-2xl bg-surface-card lg:max-w-sm lg:rounded-2xl lg:shadow-2xl lg:max-h-[90vh] lg:overflow-y-auto dark:bg-surface-900">
        {/* drag handle - mobile only */}
        <div className="flex justify-center pb-1 pt-3 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
        </div>

        {/* header */}
        <div className="flex items-start gap-2 border-b border-surface-100 px-5 py-3 lg:py-4 dark:border-surface-800">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-semibold text-surface-900 dark:text-surface-50">{link.title}</p>
            <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">{link.site_name}</p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-surface-600 lg:flex dark:text-surface-500 dark:hover:bg-surface-800 dark:hover:text-surface-300"
          >
            ✕
          </button>
        </div>

        {/* status */}
        <div className="px-4 py-4">
          <p id="sheet-status-label" className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500">Status</p>
          <div role="radiogroup" aria-labelledby="sheet-status-label" className="grid grid-cols-4 gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
            {(Object.keys(STATUS_CONFIG) as LinkStatus[]).map(s => {
              const active = link.status === s
              return (
                <button
                  key={s}
                  role="radio"
                  aria-checked={active}
                  onClick={() => { if (!active) onStatusChange(link.id, s); handleClose() }}
                  className={`flex min-h-9 items-center justify-center gap-1 rounded-lg px-1 text-xs font-medium transition ${
                    active
                      ? 'bg-surface-card text-primary-600 shadow-sm dark:bg-surface-900 dark:text-primary-400'
                      : 'text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200'
                  }`}
                >
                  <span aria-hidden="true">{STATUS_ICONS[s]}</span>
                  <span className="truncate">{STATUS_CONFIG[s].label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* delete */}
        <div className="border-t border-surface-100 p-4 dark:border-surface-800">
          {link.is_favorite ? (
            <p className="flex w-full cursor-not-allowed items-center justify-center gap-2 py-2.5 text-sm font-medium text-surface-400 dark:text-surface-600">
              <span aria-hidden="true">🔒</span> Unfavorite to delete
            </p>
          ) : confirmingDelete ? (
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm text-surface-600 dark:text-surface-400">Delete this link?</p>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-xl border border-surface-200 px-4 py-2 text-sm font-medium text-surface-600 transition hover:bg-surface-50 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
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
