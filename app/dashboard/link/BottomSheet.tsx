'use client'

import type { MockLink } from '@/lib/mock-data'
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
  link: MockLink | null
  currentStatus: LinkStatus
  onStatusChange: (id: string, status: LinkStatus) => void
  onClose: () => void
}

export default function BottomSheet({ link, currentStatus, onStatusChange, onClose }: Props) {
  if (!link) return null

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="absolute bottom-0 left-0 right-0 animate-sheet-up rounded-t-2xl bg-white"
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle */}
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        {/* header */}
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
          <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-slate-900">{link.title}</p>
        </div>

        {/* status options */}
        <ul className="py-2">
          {(Object.keys(STATUS_CONFIG) as LinkStatus[]).map(s => {
            const active = currentStatus === s
            return (
              <li key={s}>
                <button
                  onClick={() => { onStatusChange(link.id, s); onClose() }}
                  className={`flex w-full items-center gap-4 px-5 py-4 text-left transition active:bg-slate-100 ${
                    active ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">{STATUS_ICONS[s]}</span>
                  <span className={`text-sm font-medium ${active ? 'text-indigo-600' : 'text-slate-700'}`}>
                    {STATUS_CONFIG[s].label}
                  </span>
                  {active && (
                    <span className="ml-auto text-sm font-semibold text-indigo-600">✓</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {/* iPhone safe-area bottom padding */}
        <div className="h-8" />
      </div>
    </div>
  )
}
