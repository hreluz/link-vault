'use client'

import { createPortal } from 'react-dom'
import { useDashboardHeaderSlot } from '@/lib/context/DashboardHeaderSlotContext'
import { displayTitle } from '@/lib/utils/urlTitle'
import { useLinkListContext } from './LinkListContext'
import { UndoIcon } from '@/components/icons'

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
      <UndoIcon className="h-5 w-5" />
    </button>,
    slot,
  )
}
