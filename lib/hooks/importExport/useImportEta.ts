'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { simulateImportMs, type EstimateRow } from '@/lib/services/importExport/importEstimate'
import { hostGroupOf, needsMetaFetch } from '@/lib/services/importExport/fetchGuard'
import type { ImportRowOutcome } from '@/lib/services/links'

/** Rows finished (after the first progress event) before the estimate is calibrated to real speed.
 *  With metadata on, only rows that actually fetched count: duplicates finish almost instantly
 *  and would otherwise make the rest of the import look far faster than it is. */
export const ETA_CALIBRATION_ROWS = 3
/** Active time (after the first progress event) before the estimate is calibrated to real speed. */
export const ETA_CALIBRATION_MS = 3000
// Keeps one unusually fast or slow stretch from swinging the estimate wildly.
const MIN_RATIO = 0.25
const MAX_RATIO = 4

type Run = {
  rows: readonly EstimateRow[]
  withMetadata: boolean
  skippedGroups: Set<string>
  /** Per row index: whether the finished row did a metadata fetch. */
  fetched: boolean[]
  /** Rows finished after the anchor that did a metadata fetch. */
  fetchedSinceAnchor: number
  /** First progress event: `done` and the time it arrived. Timing is measured from here, so
   *  setup before the first row (CSV categories, a vault's earlier phases) never counts. */
  anchor: { done: number; at: number } | null
  pausedMs: number
  pausedAt: number | null
}

/** Live time-left estimate for a running link import. `paused` is true while the import waits
 *  on a host-block decision; that time is left out of the measured speed. */
export function useImportEta(paused: boolean, now: () => number = Date.now) {
  const [etaMs, setEtaMs] = useState<number | null>(null)
  const runRef = useRef<Run | null>(null)

  useEffect(() => {
    const run = runRef.current
    if (!run) return
    if (paused) {
      run.pausedAt ??= now()
    } else if (run.pausedAt !== null) {
      run.pausedMs += now() - run.pausedAt
      run.pausedAt = null
    }
  }, [paused, now])

  const start = useCallback((rows: readonly EstimateRow[], withMetadata: boolean) => {
    runRef.current = {
      rows, withMetadata, skippedGroups: new Set(), fetched: [],
      fetchedSinceAnchor: 0, anchor: null, pausedMs: 0, pausedAt: null,
    }
    setEtaMs(null)
  }, [])

  const stop = useCallback(() => {
    runRef.current = null
    setEtaMs(null)
  }, [])

  /** The host group's remaining rows will be imported without a fetch. */
  const skipGroup = useCallback((group: string) => {
    runRef.current?.skippedGroups.add(group)
  }, [])

  /** Call on each links-phase progress event with the number of rows finished and what
   *  happened to the row that just finished. */
  const recordProgress = useCallback((done: number, outcome?: ImportRowOutcome) => {
    const run = runRef.current
    if (!run) return
    const at = now()
    const index = done - 1
    const row = run.rows[index]
    const group = row ? hostGroupOf(row.url) : null
    const fetched = !!row && outcome?.status === 'imported' && run.withMetadata && needsMetaFetch(row)
      && group !== null && !run.skippedGroups.has(group)
    run.fetched[index] = fetched

    if (!run.anchor) {
      run.anchor = { done, at }
      run.pausedMs = 0
    } else if (fetched) {
      run.fetchedSinceAnchor++
    }

    const remaining = simulateImportMs(run.rows.slice(done), {
      withMetadata: run.withMetadata, skippedGroups: run.skippedGroups,
    })

    const sampleRows = run.withMetadata ? run.fetchedSinceAnchor : done - run.anchor.done
    const activeMs = at - run.anchor.at - run.pausedMs
    let ratio = 1
    if (sampleRows >= ETA_CALIBRATION_ROWS && activeMs >= ETA_CALIBRATION_MS) {
      // Finished rows are predicted with what they actually did, so duplicates cost a row, not a fetch.
      const start = run.anchor.done
      const finished = run.rows.slice(start, done).map((r, i) => ({ ...r, noFetch: !run.fetched[start + i] }))
      const predicted = simulateImportMs(finished, { withMetadata: run.withMetadata })
      if (predicted > 0) ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, activeMs / predicted))
    }
    setEtaMs(remaining * ratio)
  }, [now])

  return { etaMs: paused ? null : etaMs, start, stop, skipGroup, recordProgress }
}
