'use client'

import Link from 'next/link'
import { toggleAutoFetchPreferenceAction } from './actions'
import { useAsyncToggle } from '@/lib/hooks/useAsyncToggle'

export default function LinkPreferencesForm({
  initialAutoFetchEnabled,
}: {
  initialAutoFetchEnabled: boolean
}) {
  const { enabled, error, isPending, toggle: handleToggle } = useAsyncToggle(
    initialAutoFetchEnabled,
    toggleAutoFetchPreferenceAction,
  )

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link
        href="/dashboard/config"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <span aria-hidden="true">←</span> Config
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-slate-50">Link Preferences</h1>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        {error && (
          <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-50">Auto-fetch link details</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {enabled
                ? 'New links auto-fetch title, image & details by default.'
                : 'New links start with auto-fetch off by default.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={isPending}
            onClick={handleToggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
              enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                enabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>
    </main>
  )
}
