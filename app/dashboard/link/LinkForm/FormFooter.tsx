'use client'

import { useEffect, useRef } from 'react'
import { useLinkFormContext } from '../LinkFormContext'

interface Props {
  className?: string
}

const SECONDARY_BUTTON = 'rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100'

export default function FormFooter({ className = 'mt-6 flex gap-3' }: Props) {
  const { url, submitting, hasChanges, onSubmit, onCancel, submitLabel, discardPrompt } = useLinkFormContext()

  if (discardPrompt) {
    return <DiscardBar className={className} {...discardPrompt} />
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className={`flex-1 ${SECONDARY_BUTTON}`}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !url.trim() || hasChanges === false}
        title={hasChanges === false ? 'No changes to save' : undefined}
        className="flex-1 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}

interface DiscardBarProps {
  className: string
  onKeepEditing: () => void
  onDiscard: () => void
}

function DiscardBar({ className, onKeepEditing, onDiscard }: DiscardBarProps) {
  const keepRef = useRef<HTMLButtonElement>(null)

  // Focus the safe choice, so Enter keeps the edits rather than throwing them away.
  useEffect(() => { keepRef.current?.focus() }, [])

  return (
    <div className={`${className} items-center`}>
      <p role="status" className="flex-1 text-sm font-medium text-surface-700 dark:text-surface-300">
        Discard changes?
      </p>
      <button ref={keepRef} type="button" onClick={onKeepEditing} className={SECONDARY_BUTTON}>
        Keep editing
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        Discard
      </button>
    </div>
  )
}
