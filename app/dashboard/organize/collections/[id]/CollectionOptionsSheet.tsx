'use client'

import { PencilIcon, TrashIcon } from '@/components/icons'
import SheetShell from '@/components/SheetShell'

type Props = {
  isOpen: boolean
  collectionName: string
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  returnFocus?: () => HTMLElement | null
}

const ROW =
  'focus-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition hover:bg-surface-100 dark:hover:bg-surface-800'

/** The collection header's ··· menu: Edit and Delete, kept out of the main actions. */
export default function CollectionOptionsSheet({ isOpen, collectionName, onEdit, onDelete, onClose, returnFocus }: Props) {
  return (
    <SheetShell isOpen={isOpen} title={collectionName} onClose={onClose} returnFocus={returnFocus}>
      <div className="space-y-1">
        <button
          type="button"
          data-autofocus=""
          onClick={() => { onClose(); onEdit() }}
          className={`${ROW} text-surface-700 dark:text-surface-200`}
        >
          <PencilIcon className="h-5 w-5 text-surface-500 dark:text-surface-400" />
          Edit collection
        </button>
        <button
          type="button"
          onClick={() => { onClose(); onDelete() }}
          className={`${ROW} text-red-600 dark:text-red-400`}
        >
          <TrashIcon className="h-5 w-5" />
          Delete collection
        </button>
      </div>
    </SheetShell>
  )
}
