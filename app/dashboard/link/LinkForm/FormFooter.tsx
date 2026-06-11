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
        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !url.trim()}
        className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </div>
  )
}
