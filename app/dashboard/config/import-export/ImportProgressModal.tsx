'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useDialog } from '@/lib/hooks/shared/useDialog'
import { useBackdropClose } from '@/lib/hooks/shared/useBackdropClose'
import type { ImportFailureReason } from '@/lib/services/links'
import type { VaultImportPhase, VaultImportProgress } from '@/lib/services/importExport/importVault'
import type {
  ImportLastResult, ImportModalState, ImportRun, ImportStats,
} from '@/lib/hooks/importExport/useLinkImport'

const REASON_LABELS: Record<ImportFailureReason, string> = {
  invalid_url: 'Invalid URL',
  save_error: "Couldn't save",
}

const PHASE_TEXT: Record<VaultImportPhase, string> = {
  categories: 'Setting up categories',
  domains: 'Adding domain rules',
  tags: 'Creating tags',
  links: 'Importing links',
  preferences: 'Applying appearance settings',
}

function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`
}

interface Props {
  state: ImportModalState
  stats: ImportStats
  run: ImportRun | null
  progress: VaultImportProgress | null
  result: ImportLastResult | null
  error: string | null
  onClose: () => void
}

export default function ImportProgressModal({ state, stats, run, progress, result, error, onClose }: Props) {
  const isOpen = state !== 'closed'
  const running = state === 'running'
  // Escape and the backdrop are ignored mid-import, like the hidden close controls.
  const close = running ? () => {} : onClose
  const dialog = useDialog({ isOpen, onClose: close })
  const backdrop = useBackdropClose(close)
  const doneRef = useRef<HTMLButtonElement>(null)

  // The links total is only known from links-phase progress events; keep it once
  // seen so the bar stays full while a v2 restore moves on to preferences.
  // Adjusted during render (not in an effect) so the bar never paints a stale total.
  const [linksTotal, setLinksTotal] = useState(0)
  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state === 'running') setLinksTotal(0)
  }
  if (progress?.phase === 'links' && progress.total !== linksTotal) setLinksTotal(progress.total)

  // Focus lands on the panel while running (no controls yet); move it to Done once there is one.
  useEffect(() => {
    if (state === 'finished' || state === 'error') doneRef.current?.focus()
  }, [state])

  if (!isOpen) return null

  const processed = stats.imported + stats.duplicates + stats.failed
  const total = Math.max(linksTotal, processed)
  const remaining = total - processed
  const inLinksPhase = progress?.phase === 'links'
  const indeterminate = running && !inLinksPhase && total === 0

  const phaseText = running && run?.isVault && progress && !inLinksPhase ? PHASE_TEXT[progress.phase] : null

  const heading = state === 'running'
    ? (run?.isVault ? 'Importing everything' : 'Importing links')
    : state === 'finished' ? 'Import finished' : 'Import stopped'

  let statusLine: string
  if (running) {
    statusLine = total > 0 && (inLinksPhase || processed < total)
      ? `Processing ${processed} of ${total} — ${remaining} remaining`
      : 'Preparing…'
  } else {
    statusLine = `${plural(processed, 'link')} processed`
  }

  const segments = [
    { key: 'imported', value: stats.imported, className: 'bg-primary-600 dark:bg-primary-500' },
    { key: 'duplicates', value: stats.duplicates, className: 'bg-surface-400 dark:bg-surface-500' },
    { key: 'failed', value: stats.failed, className: 'bg-red-500' },
  ]

  const counters = [
    { label: 'Imported', value: stats.imported, swatch: 'bg-primary-600 dark:bg-primary-500' },
    { label: 'Already existed', value: stats.duplicates, swatch: 'bg-surface-400 dark:bg-surface-500' },
    { label: 'Failed', value: stats.failed, swatch: 'bg-red-500' },
    ...(run?.withMetadata
      ? [{ label: 'Without metadata', value: stats.metaMissing, swatch: 'ring-2 ring-inset ring-amber-400 bg-transparent' }]
      : []),
  ]

  const created: string[] = []
  if (result?.categoriesCreated) created.push(plural(result.categoriesCreated, 'category', 'categories'))
  if (result?.tagsCreated) created.push(plural(result.tagsCreated, 'tag'))
  if (result?.domainsCreated) created.push(plural(result.domainsCreated, 'domain rule'))

  const notApplied: string[] = []
  if (result?.domainsFailed) notApplied.push(plural(result.domainsFailed, 'domain rule'))
  if (result?.preferencesFailed?.length) notApplied.push(plural(result.preferencesFailed.length, 'appearance setting'))

  async function copyFailedUrls() {
    try {
      await navigator.clipboard.writeText(stats.failures.map(f => f.url).join('\n'))
      toast.success('Copied')
    } catch {
      toast.error("Couldn't copy. Select the URLs in the list instead.")
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4"
      {...backdrop}
    >
      <div
        {...dialog.dialogProps}
        aria-busy={running}
        className="flex w-full max-w-md animate-sheet-up flex-col rounded-t-2xl bg-surface-card shadow-xl ring-1 ring-surface-200 outline-none sm:animate-none sm:rounded-2xl dark:bg-surface-900 dark:ring-surface-700"
        style={{ maxHeight: '90dvh' }}
      >
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
        </div>

        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pb-6 pt-3 sm:pt-6">
          <div>
            <h2 id={dialog.titleId} className="text-base font-semibold text-surface-900 dark:text-surface-50">
              {heading}
            </h2>
            <p className="mt-1 text-sm tabular-nums text-surface-500 dark:text-surface-400">
              {phaseText ?? statusLine}
            </p>
            {phaseText && progress && (
              <p className="mt-0.5 text-xs tabular-nums text-surface-400 dark:text-surface-500">
                {progress.done} of {progress.total}
              </p>
            )}
          </div>

          {/* The composition bar: fills by outcome, so its colors are the counters below. */}
          <div
            role="progressbar"
            aria-label="Links processed"
            aria-valuemin={0}
            aria-valuemax={indeterminate ? undefined : total}
            aria-valuenow={indeterminate ? undefined : processed}
            className="relative flex h-2.5 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800"
          >
            {indeterminate ? (
              <div className="absolute inset-y-0 left-0 w-2/5 animate-import-sweep rounded-full bg-primary-500/70" />
            ) : (
              segments.map(seg => seg.value > 0 && (
                <div
                  key={seg.key}
                  className={`h-full transition-[width] duration-300 ease-out motion-reduce:transition-none ${seg.className}`}
                  style={{ width: `${(seg.value / Math.max(total, 1)) * 100}%` }}
                />
              ))
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {counters.map(c => (
              <div key={c.label} className="flex items-start gap-2.5">
                <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${c.swatch}`} />
                <div className="flex flex-col-reverse">
                  <dt className="text-xs text-surface-500 dark:text-surface-400">{c.label}</dt>
                  <dd className="text-xl font-semibold leading-tight tabular-nums text-surface-900 dark:text-surface-50">
                    {c.value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          {state === 'finished' && created.length > 0 && (
            <p className="text-sm text-surface-600 dark:text-surface-300">
              Also created {created.join(', ')}.
            </p>
          )}

          {state === 'finished' && notApplied.length > 0 && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              {notApplied.join(' and ')} couldn&apos;t be applied. See the browser console for details.
            </p>
          )}

          {state === 'error' && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <p className="font-medium">{error}</p>
              <p className="mt-1 text-red-600/80 dark:text-red-400/80">Links imported before this point are kept.</p>
            </div>
          )}

          {!running && stats.failures.length > 0 && (
            <section aria-labelledby="import-failed-heading">
              <h3 id="import-failed-heading" className="text-sm font-medium text-surface-700 dark:text-surface-200">
                Failed links
              </h3>
              <ul className="mt-2 max-h-48 divide-y divide-surface-100 overflow-y-auto rounded-xl ring-1 ring-surface-200 dark:divide-surface-800 dark:ring-surface-700">
                {stats.failures.map((f, i) => (
                  <li key={`${i}-${f.url}`} className="flex items-baseline justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 break-all text-sm text-surface-800 dark:text-surface-100">{f.url || '(empty)'}</span>
                    <span className="shrink-0 text-xs font-medium text-red-600 dark:text-red-400">{REASON_LABELS[f.reason]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!running && (
            <div className="flex gap-3">
              {stats.failures.length > 0 && (
                <button
                  type="button"
                  onClick={copyFailedUrls}
                  className="flex-1 rounded-xl border border-surface-200 bg-surface-card px-4 py-2.5 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
                >
                  Copy failed URLs
                </button>
              )}
              <button
                ref={doneRef}
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
