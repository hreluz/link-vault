// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImportEta } from '@/lib/hooks/importExport/useImportEta'
import { simulateImportMs, EST_ROW_MS } from '@/lib/services/importExport/importEstimate'

const ROWS = Array.from({ length: 10 }, (_, i) => ({ url: `https://h${i}.com` }))

function setup(withMetadata = false) {
  const clock = { t: 0 }
  const hook = renderHook(({ paused }) => useImportEta(paused, () => clock.t), { initialProps: { paused: false } })
  act(() => hook.result.current.start(ROWS, withMetadata))
  return { clock, hook }
}

describe('useImportEta', () => {
  it('is null before the first progress event', () => {
    const { hook } = setup()
    expect(hook.result.current.etaMs).toBeNull()
  })

  it('uses the uncalibrated simulation before enough rows have finished', () => {
    const { clock, hook } = setup()
    act(() => hook.result.current.recordProgress(1))
    clock.t = 50_000
    act(() => hook.result.current.recordProgress(2))
    expect(hook.result.current.etaMs).toBe(8 * EST_ROW_MS)
  })

  it('calibrates to the measured speed once enough rows and time have passed', () => {
    const { clock, hook } = setup()
    act(() => hook.result.current.recordProgress(1))
    // 4 rows in 4 s: 1 s per row, vs the model's EST_ROW_MS.
    clock.t = 4000
    act(() => hook.result.current.recordProgress(5))
    const ratio = Math.min(4, 4000 / (4 * EST_ROW_MS))
    expect(hook.result.current.etaMs).toBeCloseTo(5 * EST_ROW_MS * ratio)
  })

  it('leaves paused time out of the measured speed and hides the ETA while paused', () => {
    const { clock, hook } = setup()
    act(() => hook.result.current.recordProgress(1))
    clock.t = 1000
    hook.rerender({ paused: true })
    expect(hook.result.current.etaMs).toBeNull()
    clock.t = 61_000
    hook.rerender({ paused: false })
    clock.t = 63_000
    act(() => hook.result.current.recordProgress(5))
    // 3 s active for 4 rows, so the 60 s pause did not count.
    expect(hook.result.current.etaMs).toBeCloseTo(5 * EST_ROW_MS * (3000 / (4 * EST_ROW_MS)))
  })

  it('drops the fetch cost of a skipped host group', () => {
    const rows = [{ url: 'https://youtu.be/a' }, { url: 'https://youtu.be/b' }, { url: 'https://youtu.be/c' }]
    const clock = { t: 0 }
    const { result } = renderHook(() => useImportEta(false, () => clock.t))
    act(() => result.current.start(rows, true))
    act(() => result.current.recordProgress(1))
    expect(result.current.etaMs).toBe(simulateImportMs(rows.slice(1), { withMetadata: true }))
    act(() => result.current.skipGroup('youtube.com'))
    act(() => result.current.recordProgress(2))
    expect(result.current.etaMs).toBe(EST_ROW_MS)
  })

  it('clears on stop', () => {
    const { hook } = setup()
    act(() => hook.result.current.recordProgress(1))
    act(() => hook.result.current.stop())
    expect(hook.result.current.etaMs).toBeNull()
  })
})

describe('useImportEta with leading duplicates', () => {
  const imported = (url: string) => ({ url, status: 'imported' as const, metaMissing: false })
  const duplicate = (url: string) => ({ url, status: 'duplicate' as const })
  // 40 rows already in the vault, then 60 new ones on varied hosts.
  const rows = Array.from({ length: 100 }, (_, i) => ({ url: `https://h${i % 7}.com/${i}` }))

  function run() {
    const clock = { t: 0 }
    const { result } = renderHook(() => useImportEta(false, () => clock.t))
    act(() => result.current.start(rows, true))
    const finish = (done: number, outcome: Parameters<typeof result.current.recordProgress>[1], t: number) => {
      clock.t = t
      act(() => result.current.recordProgress(done, outcome))
    }
    return { result, finish }
  }

  it('does not scale the estimate down after fast duplicates', () => {
    const { result, finish } = run()
    for (let i = 1; i <= 40; i++) finish(i, duplicate(rows[i - 1].url), i * 200)
    expect(result.current.etaMs).toBe(simulateImportMs(rows.slice(40), { withMetadata: true }))
  })

  it('calibrates against fetched rows only, predicting duplicates as cheap rows', () => {
    const { result, finish } = run()
    let t = 0
    for (let i = 1; i <= 40; i++) finish(i, duplicate(rows[i - 1].url), (t += 200))
    // 3 fetched rows on distinct hosts at 1 s each: twice faster than the model (1.8 s).
    for (let i = 41; i <= 43; i++) finish(i, imported(rows[i - 1].url), (t += 1000))
    // Timing starts at the first event (row 1), so rows 2..43 are the measured sample.
    const finished = rows.slice(1, 43).map((r, i) => ({ ...r, noFetch: i + 1 < 40 }))
    const ratio = (t - 200) / simulateImportMs(finished, { withMetadata: true })
    expect(ratio).toBeGreaterThan(0.25)
    expect(result.current.etaMs).toBeCloseTo(simulateImportMs(rows.slice(43), { withMetadata: true }) * ratio)
  })
})
