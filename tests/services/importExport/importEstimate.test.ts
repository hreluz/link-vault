import { describe, it, expect } from 'vitest'
import { simulateImportMs, formatEta, EST_ROW_MS, EST_FETCH_MS } from '@/lib/services/importExport/importEstimate'
import { FETCH_GAP_MS } from '@/lib/services/importExport/fetchGuard'

const rows = (...urls: string[]) => urls.map(url => ({ url }))

describe('simulateImportMs', () => {
  it('costs one row time per row without metadata', () => {
    expect(simulateImportMs(rows('https://a.com', 'https://a.com/2', 'https://b.com'), { withMetadata: false }))
      .toBe(3 * EST_ROW_MS)
  })

  it('returns 0 for no rows', () => {
    expect(simulateImportMs([], { withMetadata: true })).toBe(0)
  })

  it('spaces fetches to the same host by FETCH_GAP_MS', () => {
    const ms = simulateImportMs(rows('https://a.com/1', 'https://a.com/2'), { withMetadata: true })
    // row 1: fetch + row; row 2 waits until FETCH_GAP_MS after row 1's fetch ended.
    expect(ms).toBe(EST_FETCH_MS + Math.max(EST_ROW_MS, FETCH_GAP_MS) + EST_FETCH_MS + EST_ROW_MS)
  })

  it('does not wait between different hosts', () => {
    const ms = simulateImportMs(rows('https://a.com', 'https://b.com'), { withMetadata: true })
    expect(ms).toBe(2 * (EST_FETCH_MS + EST_ROW_MS))
  })

  it('treats related hostnames as one group', () => {
    const shared = simulateImportMs(rows('https://youtu.be/x', 'https://www.youtube.com/watch?v=y'), { withMetadata: true })
    const separate = simulateImportMs(rows('https://a.com', 'https://b.com'), { withMetadata: true })
    expect(shared).toBeGreaterThan(separate)
  })

  it('skips the fetch for rows with every metadata field filled', () => {
    const full = { url: 'https://a.com', title: 't', description: 'd', image_url: 'i', duration: '1:00' }
    expect(simulateImportMs([full], { withMetadata: true })).toBe(EST_ROW_MS)
  })

  it('skips the fetch for skipped host groups', () => {
    const ms = simulateImportMs(rows('https://youtu.be/x'), { withMetadata: true, skippedGroups: new Set(['youtube.com']) })
    expect(ms).toBe(EST_ROW_MS)
  })

  it('skips the fetch for rows marked noFetch', () => {
    expect(simulateImportMs([{ url: 'https://a.com', noFetch: true }], { withMetadata: true })).toBe(EST_ROW_MS)
  })

  it('skips the fetch for invalid URLs', () => {
    expect(simulateImportMs(rows('not a url'), { withMetadata: true })).toBe(EST_ROW_MS)
  })
})

describe('formatEta', () => {
  it.each([
    [0, 'less than a minute'],
    [59_000, 'less than a minute'],
    [60_000, 'about 1 min'],
    [4.4 * 60_000, 'about 4 min'],
    [60 * 60_000, 'about 1 h'],
    [80 * 60_000, 'about 1 h 20 min'],
  ])('%d ms -> %s', (ms, text) => {
    expect(formatEta(ms)).toBe(text)
  })
})
