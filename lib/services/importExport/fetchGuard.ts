import type { HostBlockReason, ImportLinkInput, ImportMeta } from '@/lib/services/links'

/** Default minimum time between the end of one metadata fetch and the start of the next to the same group. */
export const FETCH_GAP_MS = 2000
/** Default number of consecutive empty fetches from one group that count as a soft block (e.g. a login wall). */
export const EMPTY_STREAK_LIMIT = 3
/** Waits shorter than this are not reported to the UI. */
export const THROTTLE_NOTICE_MIN_MS = 1000
/** After this long, the progress modal's fetching line reads "Still waiting on <host>…". */
export const SLOW_FETCH_HINT_MS = 10_000

/** Admin-tunable guard values (SPEC 08); a guard without one uses the defaults above. */
export type FetchGuardConfig = { gapMs: number; emptyStreakLimit: number }

// Hostnames that hit the same infrastructure share one throttle and one breaker.
const HOST_GROUPS: Record<string, string> = {
  'youtube.com': 'youtube.com',
  'm.youtube.com': 'youtube.com',
  'youtu.be': 'youtube.com',
  'instagram.com': 'instagram.com',
  'tiktok.com': 'tiktok.com',
  'vm.tiktok.com': 'tiktok.com',
  'x.com': 'x.com',
  'twitter.com': 'x.com',
  'mobile.twitter.com': 'x.com',
}

/** The throttle/breaker group for a URL: the shared group for known related hosts,
 *  otherwise the hostname lowercased with `www.` stripped. `null` for an invalid URL. */
export function hostGroupOf(url: string): string | null {
  let hostname: string
  try {
    hostname = new URL(url.trim()).hostname.toLowerCase()
  } catch {
    return null
  }
  hostname = hostname.replace(/^www\./, '')
  if (!hostname) return null
  return HOST_GROUPS[hostname] ?? hostname
}

const isBlank = (value: string | null | undefined) => value == null || value === ''

/** Whether an import row still has an empty metadata field, so auto-fetch would fetch it. */
export function needsMetaFetch(input: Pick<ImportLinkInput, 'title' | 'description' | 'image_url' | 'duration'>): boolean {
  return [input.title, input.description, input.image_url, input.duration].some(isBlank)
}

type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>

/** Resolves after `ms`, or as soon as `signal` aborts. Never rejects. */
const defaultSleep: Sleep = (ms, signal) =>
  new Promise(resolve => {
    if (signal?.aborted) return resolve()
    const timer = setTimeout(done, ms)
    function done() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', done)
      resolve()
    }
    signal?.addEventListener('abort', done, { once: true })
  })

const isEmptyMeta = (meta: ImportMeta | null) =>
  !meta || (!meta.title && !meta.description && !meta.image && !meta.duration)

type GroupState = { lastFetchEnd: number | null; emptyStreak: number; skipped: boolean }

/** Per-import throttle + breaker state, one entry per host group. */
export function createFetchGuard(deps: { now?: () => number; sleep?: Sleep; config?: FetchGuardConfig } = {}) {
  const now = deps.now ?? Date.now
  const sleep = deps.sleep ?? defaultSleep
  const gapMs = deps.config?.gapMs ?? FETCH_GAP_MS
  const emptyStreakLimit = deps.config?.emptyStreakLimit ?? EMPTY_STREAK_LIMIT
  const groups = new Map<string, GroupState>()

  function stateOf(group: string): GroupState {
    let state = groups.get(group)
    if (!state) {
      state = { lastFetchEnd: null, emptyStreak: 0, skipped: false }
      groups.set(group, state)
    }
    return state
  }

  return {
    /** Waits until the configured gap has passed since this group's last fetch ended.
     *  Returns early when `signal` aborts; the caller checks `signal.aborted` afterwards.
     *  `onWait(until)` is called before sleeping when the wait is >= THROTTLE_NOTICE_MIN_MS. */
    async waitTurn(group: string, signal?: AbortSignal, onWait?: (until: number) => void): Promise<void> {
      const { lastFetchEnd } = stateOf(group)
      if (lastFetchEnd === null) return
      const wait = lastFetchEnd + gapMs - now()
      if (wait <= 0) return
      if (wait >= THROTTLE_NOTICE_MIN_MS) onWait?.(now() + wait)
      await sleep(wait, signal)
    },

    /** Records a finished fetch (`null` = it threw). Returns why the group now looks
     *  blocked, or `null` when it looks fine. A trip resets the empty streak. */
    record(group: string, meta: ImportMeta | null): HostBlockReason | null {
      const state = stateOf(group)
      state.lastFetchEnd = now()
      if (meta?.rateLimited) {
        state.emptyStreak = 0
        return 'rate_limited'
      }
      if (!isEmptyMeta(meta)) {
        state.emptyStreak = 0
        return null
      }
      state.emptyStreak++
      if (state.emptyStreak < emptyStreakLimit) return null
      state.emptyStreak = 0
      return 'empty_responses'
    },

    /** Stops fetching for this group for the rest of the import. */
    skip(group: string): void {
      stateOf(group).skipped = true
    },

    isSkipped(group: string): boolean {
      return groups.get(group)?.skipped ?? false
    },

    /** Clears the empty streak after a successful retry. */
    resetGroup(group: string): void {
      stateOf(group).emptyStreak = 0
    },
  }
}

export type FetchGuard = ReturnType<typeof createFetchGuard>
