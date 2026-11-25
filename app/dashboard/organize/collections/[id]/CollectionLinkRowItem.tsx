'use client'

import type { ReactNode } from 'react'
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@/components/icons'
import type { MoveDirection } from '@/lib/hooks/collections/useCollectionOrder'

const CONTROL =
  'focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-surface-500 transition hover:bg-surface-100 hover:text-surface-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100'

type Props = {
  linkId: string
  number: number
  isFirst: boolean
  isLast: boolean
  /** A swap is saving: every ▲/▼ is disabled (aria-disabled, so the focused one keeps focus). */
  isSwapping: boolean
  onMove: (direction: MoveDirection) => void
  onRemove: () => void
  /** False while a search is active: ▲/▼ aren't rendered; the number and ✕ keep their places. */
  showMoveButtons?: boolean
  children: ReactNode
}

/**
 * One collection row: the card plus its visible-place number and ▲ ▼ ✕. Below sm
 * the number and controls sit in a bar under the full-width card; from sm up the
 * number is on the left and the controls in a column on the right.
 */
export default function CollectionLinkRowItem({ linkId, number, isFirst, isLast, isSwapping, onMove, onRemove, showMoveButtons = true, children }: Props) {
  const numberEl = (extra: string) => (
    <span className={`text-sm font-semibold tabular-nums text-surface-500 dark:text-surface-400 ${extra}`}>{number}</span>
  )

  function arrow(direction: MoveDirection) {
    const edge = direction === 'up' ? isFirst : isLast
    return (
      <button
        type="button"
        data-row-action={direction}
        disabled={edge}
        aria-disabled={!edge && isSwapping ? true : undefined}
        aria-label={direction === 'up' ? 'Move up' : 'Move down'}
        onClick={() => { if (!isSwapping) onMove(direction) }}
        className={CONTROL}
      >
        {direction === 'up' ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
      </button>
    )
  }

  return (
    <li data-collection-row={linkId} className="scroll-mt-20 sm:scroll-mt-32 flex flex-col sm:flex-row sm:items-start sm:gap-3">
      {numberEl('hidden w-6 shrink-0 pt-5 text-right sm:block')}
      <div className="min-w-0 flex-1">{children}</div>
      <div className="mt-1 flex items-center justify-between px-1 sm:mt-0 sm:flex-col sm:px-0 sm:pt-2">
        {numberEl('sm:hidden')}
        <div className="flex items-center gap-1 sm:flex-col">
          {showMoveButtons && arrow('up')}
          {showMoveButtons && arrow('down')}
          <button
            type="button"
            data-row-action="remove"
            aria-label="Remove from collection"
            onClick={onRemove}
            className={`${CONTROL} hover:text-red-600 dark:hover:text-red-400`}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </li>
  )
}
