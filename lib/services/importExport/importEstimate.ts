import type { ImportLinkInput } from '@/lib/services/links'
import { FETCH_GAP_MS, hostGroupOf, needsMetaFetch } from '@/lib/services/importExport/fetchGuard'

/** Rough cost of one row without metadata: fingerprint, duplicate lookup, encrypt, insert, tag sync. */
export const EST_ROW_MS = 300
/** Rough round trip of one `fetchLinkMeta` call. */
export const EST_FETCH_MS = 1500

export type EstimateRow = Pick<ImportLinkInput, 'url' | 'title' | 'description' | 'image_url' | 'duration'> & {
  /** Known not to fetch (e.g. a finished row that turned out to be a duplicate). */
  noFetch?: boolean
}

export type EstimateOptions = {
  withMetadata: boolean
  /** Host groups whose metadata fetch was skipped ("Import without metadata"). */
  skippedGroups?: ReadonlySet<string>
  /** Same-host gap the import will use; defaults to `FETCH_GAP_MS`. */
  gapMs?: number
}

/** Replays `importLinks`'s sequential loop on a virtual clock: one row at a time, and a
 *  metadata fetch waits until the same-host gap after the previous fetch to the same host group
 *  ended. Assumes every row is new, so duplicates make the real import faster. */
export function simulateImportMs(rows: readonly EstimateRow[], { withMetadata, skippedGroups, gapMs = FETCH_GAP_MS }: EstimateOptions): number {
  let t = 0
  const lastFetchEnd = new Map<string, number>()
  for (const row of rows) {
    if (withMetadata && !row.noFetch && needsMetaFetch(row)) {
      const group = hostGroupOf(row.url)
      if (group && !skippedGroups?.has(group)) {
        const last = lastFetchEnd.get(group)
        const start = last === undefined ? t : Math.max(t, last + gapMs)
        t = start + EST_FETCH_MS
        lastFetchEnd.set(group, t)
      }
    }
    t += EST_ROW_MS
  }
  return t
}

/** "less than a minute", "about 4 min", "about 1 h 20 min". */
export function formatEta(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (ms < 60_000 || minutes < 1) return 'less than a minute'
  if (minutes < 60) return `about ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `about ${hours} h ${rest} min` : `about ${hours} h`
}
