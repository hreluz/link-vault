'use client'

import { useState } from 'react'
import type { LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '../config'

const STATUS_ICONS: Record<LinkStatus, string> = {
  unread:   '📥',
  watching: '👀',
  read:     '✅',
  favorite: '⭐',
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
    <div className="fixed inset-0 z-50" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white"
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle */}
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        {/* header */}
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="line-clamp-1 text-sm font-semibold text-slate-900">{link.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{link.site_name}</p>
        </div>

        {/* quick actions */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-100 p-4">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClose}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <span aria-hidden="true">↗</span> Open
          </a>
          <button
            onClick={() => { onEdit(); handleClose() }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <span aria-hidden="true">✏️</span> Edit
          </button>
          <button
            onClick={() => { onFavoriteToggle(); handleClose() }}
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition ${
              link.is_favorite
                ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span aria-hidden="true">{link.is_favorite ? '⭐' : '☆'}</span>
            {link.is_favorite ? 'Unstar' : 'Star'}
          </button>
        </div>

        {/* status options */}
        <ul className="py-2">
          <li className="px-5 pb-1 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
          </li>
          {(Object.keys(STATUS_CONFIG) as LinkStatus[]).map(s => {
            const active = link.status === s
            return (
              <li key={s}>
                <button
                  onClick={() => { onStatusChange(link.id, s); handleClose() }}
                  className={`flex w-full items-center gap-4 px-5 py-3.5 text-left transition active:bg-slate-100 ${
                    active ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg" aria-hidden="true">{STATUS_ICONS[s]}</span>
                  <span className={`text-sm font-medium ${active ? 'text-indigo-600' : 'text-slate-700'}`}>
                    {STATUS_CONFIG[s].label}
                  </span>
                  {active && <span className="ml-auto text-sm font-semibold text-indigo-600">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>

        {/* delete */}
        <div className="border-t border-slate-100 p-4">
          {confirmingDelete ? (
            <div className="flex items-center gap-3">
              <p className="flex-1 text-sm text-slate-600">Delete this link?</p>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <span aria-hidden="true">🗑️</span> Delete link
            </button>
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
