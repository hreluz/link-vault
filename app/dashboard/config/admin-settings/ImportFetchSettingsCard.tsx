'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { saveImportFetchSettingsAction } from './actions'
import {
  IMPORT_FETCH_LIMITS,
  validateImportFetchSettings,
  type ImportFetchSettings,
} from '@/lib/services/appSettings'

type Field = keyof ImportFetchSettings

const FIELDS: { key: Field; label: string; unit: string; hint: string }[] = [
  { key: 'fetchGapSeconds', label: 'Same-host gap', unit: 'seconds', hint: 'Wait between fetches to the same site. 0 turns it off.' },
  { key: 'retryWaitSeconds', label: 'Retry wait', unit: 'seconds', hint: 'How long "Wait and retry" waits when a site looks blocked.' },
  { key: 'emptyStreakLimit', label: 'Empty-fetch limit', unit: 'fetches', hint: 'Empty fetches in a row from one site before the import pauses.' },
]

const INPUT_CLASS =
  'w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500'

const toDraft = (settings: ImportFetchSettings): Record<Field, string> => ({
  fetchGapSeconds: String(settings.fetchGapSeconds),
  retryWaitSeconds: String(settings.retryWaitSeconds),
  emptyStreakLimit: String(settings.emptyStreakLimit),
})

/** Admin card for the import auto-fetch guard (SPEC 08): three values saved together. */
export default function ImportFetchSettingsCard({ initialSettings }: { initialSettings: ImportFetchSettings }) {
  const [draft, setDraft] = useState(() => toDraft(initialSettings))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // An empty field becomes NaN, which validation rejects.
    const settings: ImportFetchSettings = {
      fetchGapSeconds: draft.fetchGapSeconds.trim() === '' ? NaN : Number(draft.fetchGapSeconds),
      retryWaitSeconds: draft.retryWaitSeconds.trim() === '' ? NaN : Number(draft.retryWaitSeconds),
      emptyStreakLimit: draft.emptyStreakLimit.trim() === '' ? NaN : Number(draft.emptyStreakLimit),
    }
    const invalid = validateImportFetchSettings(settings)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await saveImportFetchSettingsAction(settings)
      if (!result.success) {
        setError(result.error)
        return
      }
      toast.success('Saved')
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-6 rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700"
    >
      <p className="font-medium text-surface-900 dark:text-surface-50">Import auto-fetch</p>
      <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
        Applies to every import with auto-fetch on, starting with the next one.
      </p>

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-4">
        {FIELDS.map(({ key, label, unit, hint }) => {
          const [min, max] = IMPORT_FETCH_LIMITS[key]
          const id = `import-fetch-${key}`
          return (
            <div key={key}>
              <label htmlFor={id} className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                {label} <span className="font-normal text-surface-500 dark:text-surface-400">({unit}, {min}–{max})</span>
              </label>
              <input
                id={id}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                step={1}
                value={draft[key]}
                onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                className={`mt-1.5 ${INPUT_CLASS}`}
              />
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{hint}</p>
            </div>
          )
        })}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
