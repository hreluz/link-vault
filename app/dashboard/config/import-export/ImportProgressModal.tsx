'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useDialog } from '@/lib/hooks/shared/useDialog'
import { useBackdropClose } from '@/lib/hooks/shared/useBackdropClose'
import type { ImportFailureReason } from '@/lib/services/links'
import type { VaultImportPhase, VaultImportProgress } from '@/lib/services/importExport/importVault'
import { formatEta } from '@/lib/services/importExport/importEstimate'
import {
  HOST_BLOCK_RETRY_MS,
  type HostBlockState, type ImportLastResult, type ImportModalState, type ImportRun, type ImportStats,
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

const SECONDARY_BUTTON =
  'rounded-xl border border-surface-200 bg-surface-card px-4 py-2.5 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800'

const PRIMARY_BUTTON =
  'rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-60'

function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`
}

/** `m:ss` until `retryAt`, clamped to [0, the retry wait] -- `now` may predate the click by
 *  up to one tick, which would otherwise read as more than a minute. */
function formatCountdown(retryAt: number, now: number) {
  const seconds = Math.min(Math.ceil(HOST_BLOCK_RETRY_MS / 1000), Math.max(0, Math.ceil((retryAt - now) / 1000)))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** Re-renders every second while `active`, returning the current time. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

interface HostBlockNoticeProps {
  block: HostBlockState
  onWait: () => void
  onSkip: () => void
  onLeave: () => void
}

/** Shown in place of Cancel while a host looks blocked and the import is paused. */
function HostBlockNotice({ block, onWait, onSkip, onLeave }: HostBlockNoticeProps) {
  const counting = block.retryAt !== null
  const now = useNow(counting)

  return (
    <section aria-labelledby="host-block-heading" className="flex flex-col gap-3">
      <div role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
        <p id="host-block-heading" className="font-medium break-words">
          {block.host} seems to be limiting our requests.
        </p>
        <p className="mt-1">
          {block.reason === 'rate_limited'
            ? 'It answered "Too many requests".'
            : 'The last 3 links from it came back empty.'}
        </p>
        {block.attempt > 1 && <p className="mt-1">Still blocked (attempt {block.attempt}).</p>}
      </div>
      <button type="button" onClick={onWait} disabled={counting} className={`w-full tabular-nums ${PRIMARY_BUTTON}`}>
        {counting ? `Retrying in ${formatCountdown(block.retryAt!, now)}` : 'Wait 1 minute and retry'}
      </button>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onSkip} className={`flex-auto whitespace-nowrap ${SECONDARY_BUTTON}`}>
          Import without metadata
        </button>
        <button type="button" onClick={onLeave} className={`flex-auto whitespace-nowrap ${SECONDARY_BUTTON}`}>
          Leave and try later
        </button>
      </div>
    </section>
  )
}

interface Props {
  state: ImportModalState
  stats: ImportStats
  run: ImportRun | null
  progress: VaultImportProgress | null
  result: ImportLastResult | null
  error: string | null
  /** True from the Cancel click until the current row finishes and the import returns. */
  cancelling: boolean
  /** URLs never started because of a cancel; only counted and copyable, never listed. */
  notProcessed: string[]
  /** Estimated time left for the links phase; null while paused or not yet known. */
  etaMs?: number | null
  onCancel: () => void
  onClose: () => void
  /** Set while a host looks blocked and the import is paused for a decision. */
  hostBlock: HostBlockState | null
  onBlockWait: () => void
  onBlockSkip: () => void
  onBlockLeave: () => void
}

export default function ImportProgressModal({
  state, stats, run, progress, result, error, cancelling, notProcessed, etaMs = null, onCancel, onClose,
  hostBlock, onBlockWait, onBlockSkip, onBlockLeave,
}: Props) {
  const isOpen = state !== 'closed'
  const running = state === 'running'
  const cancelled = state === 'cancelled'
  const ended = state === 'finished' || cancelled
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

  // Focus lands on the panel while running (not on Cancel, so a stray Enter can't stop the
  // import); move it to Done once there is one.
  useEffect(() => {
    if (state === 'finished' || state === 'cancelled' || state === 'error') doneRef.current?.focus()
  }, [state])

  if (!isOpen) return null

  const processed = stats.imported + stats.duplicates + stats.failed
  // After a cancel the unprocessed rows stay as the bar's empty track.
  const total = Math.max(linksTotal, processed + (cancelled ? notProcessed.length : 0))
  const remaining = total - processed
  const inLinksPhase = progress?.phase === 'links'
  const indeterminate = running && !inLinksPhase && total === 0

  const phaseText = running && run?.isVault && progress && !inLinksPhase ? PHASE_TEXT[progress.phase] : null

  const heading = state === 'running'
    ? (run?.isVault ? 'Importing everything' : 'Importing links')
    : state === 'finished' ? 'Import finished'
    : cancelled ? 'Import cancelled'
    : 'Import stopped'

  let statusLine: string
  if (running) {
    statusLine = total > 0 && (inLinksPhase || processed < total)
      ? `Processing ${processed} of ${total} — ${remaining} remaining`
      : 'Preparing…'
    // Hidden during a host-block pause: the notice's own countdown covers that.
    if (inLinksPhase && remaining > 0 && etaMs !== null && !hostBlock) statusLine += ` · ${formatEta(etaMs)} left`
  } else if (cancelled) {
    statusLine = `${plural(processed, 'link')} processed · ${notProcessed.length} not processed`
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
    ...(cancelled
      ? [{ label: 'Not processed', value: notProcessed.length, swatch: 'bg-surface-100 ring-1 ring-inset ring-surface-300 dark:bg-surface-800 dark:ring-surface-600' }]
      : []),
  ]

  const created: string[] = []
  if (result?.categoriesCreated) created.push(plural(result.categoriesCreated, 'category', 'categories'))
  if (result?.tagsCreated) created.push(plural(result.tagsCreated, 'tag'))
  if (result?.domainsCreated) created.push(plural(result.domainsCreated, 'domain rule'))

  const notApplied: string[] = []
  if (result?.domainsFailed) notApplied.push(plural(result.domainsFailed, 'domain rule'))
  if (result?.preferencesFailed?.length) notApplied.push(plural(result.preferencesFailed.length, 'appearance setting'))

  async function copyUrls(urls: string[], errorMessage: string) {
    try {
      await navigator.clipboard.writeText(urls.join('\n'))
      toast.success('Copied')
    } catch {
      toast.error(errorMessage)
    }
  }
  const copyFailedUrls = () =>
    copyUrls(stats.failures.map(f => f.url), "Couldn't copy. Select the URLs in the list instead.")
  const copyUnprocessedUrls = () => copyUrls(notProcessed, "Couldn't copy the unprocessed URLs.")
  const copyButtonWidth = cancelled ? 'flex-auto whitespace-nowrap' : 'flex-1'

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

          {running && hostBlock && (
            <HostBlockNotice block={hostBlock} onWait={onBlockWait} onSkip={onBlockSkip} onLeave={onBlockLeave} />
          )}

          {running && !hostBlock && (
            <button type="button" onClick={onCancel} disabled={cancelling} className={`w-full ${SECONDARY_BUTTON}`}>
              {cancelling ? 'Stopping…' : 'Cancel'}
            </button>
          )}

          {((ended && created.length > 0) || (cancelled && run?.isVault)) && (
            <p className="text-sm text-surface-600 dark:text-surface-300">
              {created.length > 0 && <>Also created {created.join(', ')}.</>}
              {created.length > 0 && cancelled && run?.isVault && ' '}
              {cancelled && run?.isVault && 'Remaining steps were skipped.'}
            </p>
          )}

          {ended && notApplied.length > 0 && (
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
            // When cancelled, the copy buttons sit on their own (wrapping) row above a
            // full-width Done, so up to three buttons still fit a 375px bottom sheet.
            <div className={cancelled ? 'flex flex-col gap-3' : 'flex gap-3'}>
              {(stats.failures.length > 0 || (cancelled && notProcessed.length > 0)) && (
                <div className={cancelled ? 'flex flex-wrap gap-3' : 'contents'}>
                  {stats.failures.length > 0 && (
                    <button type="button" onClick={copyFailedUrls} className={`${copyButtonWidth} ${SECONDARY_BUTTON}`}>
                      Copy failed URLs
                    </button>
                  )}
                  {cancelled && notProcessed.length > 0 && (
                    <button type="button" onClick={copyUnprocessedUrls} className={`${copyButtonWidth} ${SECONDARY_BUTTON}`}>
                      Copy unprocessed URLs
                    </button>
                  )}
                </div>
              )}
              <button
                ref={doneRef}
                type="button"
                onClick={onClose}
                className={`flex-1 ${PRIMARY_BUTTON}`}
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
