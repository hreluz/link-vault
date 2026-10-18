import { describe, it, expect, vi } from 'vitest'
import {
  createFetchGuard,
  hostGroupOf,
  FETCH_GAP_MS,
  EMPTY_STREAK_LIMIT,
  type FetchGuardConfig,
} from '@/lib/services/importExport/fetchGuard'
import type { ImportMeta } from '@/lib/services/links'

const FULL: ImportMeta = { title: 'T', description: null, image: null, duration: null }
const EMPTY: ImportMeta = { title: null, description: null, image: null, duration: null }
const RATE_LIMITED: ImportMeta = { ...EMPTY, rateLimited: true }

function makeGuard(config?: FetchGuardConfig) {
  let clock = 0
  const sleep = vi.fn(async (ms: number) => { clock += ms })
  const guard = createFetchGuard({ now: () => clock, sleep, config })
  return { guard, sleep, advance: (ms: number) => { clock += ms } }
}

describe('hostGroupOf', () => {
  it('maps related YouTube hosts to youtube.com', () => {
    expect(hostGroupOf('https://youtu.be/abc')).toBe('youtube.com')
    expect(hostGroupOf('https://m.youtube.com/watch?v=abc')).toBe('youtube.com')
    expect(hostGroupOf('https://www.youtube.com/watch?v=abc')).toBe('youtube.com')
  })

  it('maps twitter hosts to x.com and vm.tiktok.com to tiktok.com', () => {
    expect(hostGroupOf('https://twitter.com/a/status/1')).toBe('x.com')
    expect(hostGroupOf('https://mobile.twitter.com/a')).toBe('x.com')
    expect(hostGroupOf('https://vm.tiktok.com/xyz')).toBe('tiktok.com')
  })

  it('keys other hosts by their normalized hostname', () => {
    expect(hostGroupOf('https://example.com/a')).toBe('example.com')
    expect(hostGroupOf('https://WWW.Example.com/a')).toBe('example.com')
    expect(hostGroupOf('https://blog.example.com/a')).toBe('blog.example.com')
  })

  it('returns null for an invalid URL', () => {
    expect(hostGroupOf('not a url')).toBeNull()
  })
})

describe('createFetchGuard — throttle', () => {
  it('does not wait before the first fetch to a group', async () => {
    const { guard, sleep } = makeGuard()
    await guard.waitTurn('youtube.com')
    expect(sleep).not.toHaveBeenCalled()
  })

  it.each(['youtube.com', 'example.com'])('waits until %s gets FETCH_GAP_MS after its previous fetch ended', async group => {
    const { guard, sleep, advance } = makeGuard()
    guard.record(group, FULL)
    advance(500)
    await guard.waitTurn(group)
    expect(sleep).toHaveBeenCalledWith(FETCH_GAP_MS - 500, undefined)
  })

  it('does not wait once the gap has already passed', async () => {
    const { guard, sleep, advance } = makeGuard()
    guard.record('example.com', FULL)
    advance(FETCH_GAP_MS)
    await guard.waitTurn('example.com')
    expect(sleep).not.toHaveBeenCalled()
  })

  it('does not make a different group wait', async () => {
    const { guard, sleep } = makeGuard()
    guard.record('youtube.com', FULL)
    await guard.waitTurn('example.com')
    expect(sleep).not.toHaveBeenCalled()
  })

  it('uses the configured gap', async () => {
    const { guard, sleep } = makeGuard({ gapMs: 5000, emptyStreakLimit: EMPTY_STREAK_LIMIT })
    guard.record('example.com', FULL)
    await guard.waitTurn('example.com')
    expect(sleep).toHaveBeenCalledWith(5000, undefined)
  })

  it('never sleeps when the configured gap is 0', async () => {
    const { guard, sleep } = makeGuard({ gapMs: 0, emptyStreakLimit: EMPTY_STREAK_LIMIT })
    guard.record('example.com', FULL)
    await guard.waitTurn('example.com')
    guard.record('example.com', FULL)
    await guard.waitTurn('example.com')
    expect(sleep).not.toHaveBeenCalled()
  })

  it('returns early when the signal aborts during the wait (default sleep)', async () => {
    vi.useFakeTimers()
    try {
      const guard = createFetchGuard()
      guard.record('example.com', FULL)
      const controller = new AbortController()
      let settled = false
      const pending = guard.waitTurn('example.com', controller.signal).then(() => { settled = true })
      await vi.advanceTimersByTimeAsync(100)
      expect(settled).toBe(false)
      controller.abort()
      await pending
      expect(settled).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('createFetchGuard — breaker', () => {
  it('trips at once on a rate-limited fetch', () => {
    const { guard } = makeGuard()
    expect(guard.record('instagram.com', RATE_LIMITED)).toBe('rate_limited')
  })

  it(`trips on the ${EMPTY_STREAK_LIMIT}rd empty fetch in a row, not before`, () => {
    const { guard } = makeGuard()
    expect(guard.record('instagram.com', EMPTY)).toBeNull()
    expect(guard.record('instagram.com', null)).toBeNull()
    expect(guard.record('instagram.com', EMPTY)).toBe('empty_responses')
  })

  it('resets the streak on a non-empty fetch', () => {
    const { guard } = makeGuard()
    guard.record('instagram.com', EMPTY)
    guard.record('instagram.com', EMPTY)
    expect(guard.record('instagram.com', FULL)).toBeNull()
    expect(guard.record('instagram.com', EMPTY)).toBeNull()
    expect(guard.record('instagram.com', EMPTY)).toBeNull()
  })

  it('counts streaks per group', () => {
    const { guard } = makeGuard()
    expect(guard.record('a.com', EMPTY)).toBeNull()
    expect(guard.record('b.com', EMPTY)).toBeNull()
    expect(guard.record('c.com', EMPTY)).toBeNull()
  })

  it('resetGroup clears the empty streak', () => {
    const { guard } = makeGuard()
    guard.record('instagram.com', EMPTY)
    guard.record('instagram.com', EMPTY)
    guard.resetGroup('instagram.com')
    expect(guard.record('instagram.com', EMPTY)).toBeNull()
  })

  it('trips on the first empty fetch when the configured limit is 1', () => {
    const { guard } = makeGuard({ gapMs: FETCH_GAP_MS, emptyStreakLimit: 1 })
    expect(guard.record('instagram.com', EMPTY)).toBe('empty_responses')
  })

  it('waits for the configured limit of empty fetches', () => {
    const { guard } = makeGuard({ gapMs: FETCH_GAP_MS, emptyStreakLimit: 5 })
    for (let i = 0; i < 4; i++) expect(guard.record('instagram.com', EMPTY)).toBeNull()
    expect(guard.record('instagram.com', EMPTY)).toBe('empty_responses')
  })

  it('skip marks only that group as skipped', () => {
    const { guard } = makeGuard()
    guard.skip('instagram.com')
    expect(guard.isSkipped('instagram.com')).toBe(true)
    expect(guard.isSkipped('youtube.com')).toBe(false)
  })
})
