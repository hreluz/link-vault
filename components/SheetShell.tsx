'use client'

import type { ReactNode } from 'react'
import { useBackdropClose } from '@/lib/hooks/shared/useBackdropClose'
import { useDialog } from '@/lib/hooks/shared/useDialog'

/**
 * A bottom sheet on phones, a centred panel from lg up (BottomSheet's shell):
 * useDialog semantics (named by the heading, Escape, Tab trap, focus return),
 * a ✕ Close button, and an optional footer pinned under the scrolling body.
 */
export default function SheetShell({ isOpen, title, onClose, children, footer, returnFocus }: {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  returnFocus?: () => HTMLElement | null
}) {
  const backdrop = useBackdropClose(onClose)
  const dialog = useDialog({ isOpen, onClose, returnFocus })
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center" {...backdrop}>
      <div className="pointer-events-none absolute inset-0 bg-black/40 lg:backdrop-blur-sm" />
      <div
        {...dialog.dialogProps}
        className="relative flex max-h-[85dvh] w-full flex-col rounded-t-2xl bg-surface-card pb-[max(1rem,env(safe-area-inset-bottom))] outline-none lg:max-h-[80dvh] lg:max-w-md lg:rounded-2xl lg:pb-0 lg:shadow-2xl dark:bg-surface-900"
      >
        <div aria-hidden="true" className="flex justify-center pb-1 pt-3 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
        </div>
        <div className="flex items-center gap-2 border-b border-surface-100 px-5 py-3 lg:py-4 dark:border-surface-800">
          <h2 id={dialog.titleId} className="min-w-0 flex-1 truncate text-sm font-semibold text-surface-900 dark:text-surface-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="focus-ring -my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-surface-400 transition hover:bg-surface-100 hover:text-surface-600 dark:text-surface-500 dark:hover:bg-surface-800 dark:hover:text-surface-300"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-surface-100 px-4 py-3 dark:border-surface-800">{footer}</div>}
      </div>
    </div>
  )
}
