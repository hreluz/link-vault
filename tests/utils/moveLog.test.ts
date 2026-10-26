// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { isMoveLogEnabled, logMove, rememberMoveTitle, MOVE_LOG_FLAG } from '@/lib/utils/moveLog'

let info: MockInstance<typeof console.info>

beforeEach(() => {
  localStorage.clear()
  info = vi.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('moveLog', () => {
  it('is off by default and logs nothing', () => {
    expect(isMoveLogEnabled()).toBe(false)
    logMove('opened', { id: 'a' })
    expect(info).not.toHaveBeenCalled()
  })

  it('logs with the prefix, event and data when the flag is "1"', () => {
    localStorage.setItem(MOVE_LOG_FLAG, '1')
    logMove('opened', { id: 'a' })
    expect(info).toHaveBeenCalledExactlyOnceWith(
      '[move-to-end]', 'opened', expect.objectContaining({ id: 'a', at: expect.stringMatching(/^\d{2}:\d{2}:\d{2}\.\d{3}$/) }),
    )
  })

  it('ignores other flag values', () => {
    localStorage.setItem(MOVE_LOG_FLAG, 'true')
    expect(isMoveLogEnabled()).toBe(false)
  })

  it('stays off when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(isMoveLogEnabled()).toBe(false)
    logMove('opened')
    expect(info).not.toHaveBeenCalled()
  })

  it('does not add titles with the "1" flag', () => {
    localStorage.setItem(MOVE_LOG_FLAG, '1')
    rememberMoveTitle({ id: 'ids-only', title: 'Secret title', url: 'https://example.com' })
    logMove('opened', { id: 'ids-only' })
    expect(info.mock.calls[0][2]).not.toHaveProperty('title')
  })

  it('adds the remembered title for id and ids with the "titles" flag', () => {
    localStorage.setItem(MOVE_LOG_FLAG, 'titles')
    expect(isMoveLogEnabled()).toBe(true)
    rememberMoveTitle({ id: 't1', title: 'Flexbox guide', url: 'https://a.dev' })
    rememberMoveTitle({ id: 't2', title: null, url: 'https://b.dev/x' })

    logMove('fired', { id: 't1' })
    logMove('cancelled-all', { ids: ['t1', 't2', 'unknown'] })

    expect(info.mock.calls[0][2]).toMatchObject({ id: 't1', title: 'Flexbox guide' })
    expect(info.mock.calls[1][2]).toMatchObject({ titles: ['Flexbox guide', 'https://b.dev/x', null] })
  })

  it('does not remember titles unless the flag is "titles"', () => {
    localStorage.setItem(MOVE_LOG_FLAG, '1')
    rememberMoveTitle({ id: 'late', title: 'Remembered too early', url: 'https://c.dev' })
    localStorage.setItem(MOVE_LOG_FLAG, 'titles')
    logMove('fired', { id: 'late' })
    expect(info.mock.calls[0][2]).toMatchObject({ id: 'late', title: null })
  })
})
