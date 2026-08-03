'use client'

import { useLinkFormContext } from '../LinkFormContext'

interface Props {
  className?: string
}

export default function FormFooter({ className = 'mt-6 flex gap-3' }: Props) {
  const { url, submitting, onSubmit, onCancel, submitLabel } = useLinkFormContext()

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="flex-1 rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-100"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !url.trim()}
        className="flex-1 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}
