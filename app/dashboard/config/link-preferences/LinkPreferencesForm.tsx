'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { saveMoveToEndDelayAction, toggleAutoFetchPreferenceAction } from './actions'
import { useAsyncToggle } from '@/lib/hooks/shared/useAsyncToggle'
import { MOVE_TO_END_DELAY_LIMITS, validateMoveToEndDelay } from '@/lib/services/userPreferences'

const [DELAY_MIN, DELAY_MAX] = MOVE_TO_END_DELAY_LIMITS

export default function LinkPreferencesForm({
  initialAutoFetchEnabled,
  initialMoveToEndDelaySeconds,
}: {
  initialAutoFetchEnabled: boolean
  initialMoveToEndDelaySeconds: number
}) {
  const { enabled, error: toggleError, isPending, toggle: handleToggle } = useAsyncToggle(
    initialAutoFetchEnabled,
    toggleAutoFetchPreferenceAction,
  )
  const [delayDraft, setDelayDraft] = useState(String(initialMoveToEndDelaySeconds))
  const [delayError, setDelayError] = useState<string | null>(null)
  const [isSavingDelay, startSavingDelay] = useTransition()
  const error = delayError ?? toggleError

  function handleDelaySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // An empty field becomes NaN, which validation rejects.
    const seconds = delayDraft.trim() === '' ? NaN : Number(delayDraft)
    const invalid = validateMoveToEndDelay(seconds)
    if (invalid) {
      setDelayError(invalid)
      return
    }
    setDelayError(null)
    startSavingDelay(async () => {
      const result = await saveMoveToEndDelayAction(seconds)
      if (!result.success) {
        setDelayError(result.error)
        return
      }
      toast.success('Saved')
    })
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link
        href="/dashboard/config"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-surface-500 transition hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
      >
        <span aria-hidden="true">←</span> Config
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-surface-900 dark:text-surface-50">Link Preferences</h1>

      <div className="rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
        {error && (
          <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-surface-900 dark:text-surface-50">Auto-fetch link details</p>
            <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
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
              enabled ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-700'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                enabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        <form onSubmit={handleDelaySubmit} noValidate className="mt-6 border-t border-surface-200 pt-6 dark:border-surface-700">
          <p className="font-medium text-surface-900 dark:text-surface-50">Move opened links to the end</p>
          <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
            How long a link you opened stays in place before moving. Applies the next time the dashboard loads.
          </p>
          <label htmlFor="move-to-end-delay" className="mt-4 block text-sm font-medium text-surface-700 dark:text-surface-300">
            Move opened links to the end after <span className="font-normal text-surface-500 dark:text-surface-400">(seconds, {DELAY_MIN}–{DELAY_MAX})</span>
          </label>
          <input
            id="move-to-end-delay"
            type="number"
            inputMode="numeric"
            min={DELAY_MIN}
            max={DELAY_MAX}
            step={1}
            value={delayDraft}
            onChange={e => setDelayDraft(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
          />
          <button
            type="submit"
            disabled={isSavingDelay}
            className="mt-4 w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingDelay ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </main>
  )
}
