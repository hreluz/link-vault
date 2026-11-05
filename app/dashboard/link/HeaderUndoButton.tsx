'use client'

import { createPortal } from 'react-dom'
import { useDashboardHeaderSlot } from '@/lib/context/DashboardHeaderSlotContext'
import { displayTitle } from '@/lib/utils/urlTitle'
import { useLinkListContext } from './LinkListContext'

// Undo for the last move-to-end, portalled into the sticky DashboardHeader so it
// stays reachable at any scroll position (SPEC 36). Only LinkList renders it,
// so it never shows on other dashboard pages.
export default function HeaderUndoButton() {
  const { slot } = useDashboardHeaderSlot()
  const { lastMovedLink, undoingMove, handleUndoMove } = useLinkListContext()
  if (!slot || !lastMovedLink) return null

  return createPortal(
    <button
      type="button"
      onClick={handleUndoMove}
      disabled={undoingMove}
      aria-label="Undo last move"
      title={`Move ${displayTitle(lastMovedLink)} back`}
      className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl border border-surface-200 bg-surface-card text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:w-9 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
    >
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M7.5 5 4 8.5 7.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 8.5h7.5a4.5 4.5 0 0 1 0 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>,
    slot,
  )
}
