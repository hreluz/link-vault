// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMoveOpenedToEnd, MOVE_TO_END_DELAY_MS } from '@/lib/hooks/links/list/useMoveOpenedToEnd'

type Props = { pausedAll: boolean; pausedId: string | null }

const onMove = vi.fn()

function setup(initial: Props = { pausedAll: false, pausedId: null }) {
  return renderHook((props: Props) => useMoveOpenedToEnd({ onMove, ...props }), { initialProps: initial })
}

function advance(ms: number) {
  act(() => { vi.advanceTimersByTime(ms) })
}

beforeEach(() => {
  vi.useFakeTimers()
  onMove.mockReset()
})

afterEach(() => vi.useRealTimers())

describe('useMoveOpenedToEnd', () => {
  it('uses a 30 s delay', () => {
    expect(MOVE_TO_END_DELAY_MS).toBe(30_000)
  })

  it('calls onMove at 30 s, not at 29.9 s', () => {
    const { result } = setup()
    act(() => result.current.schedule('a'))

    advance(29_900)
    expect(onMove).not.toHaveBeenCalled()

    advance(100)
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('fires two scheduled ids independently at their own 30 s marks', () => {
    const { result } = setup()
    act(() => result.current.schedule('a'))
    advance(10_000)
    act(() => result.current.schedule('b'))

    advance(20_000)
    expect(onMove.mock.calls).toEqual([['a']])

    advance(10_000)
    expect(onMove.mock.calls).toEqual([['a'], ['b']])
  })

  it('restarts the timer when an id is rescheduled', () => {
    const { result } = setup()
    act(() => result.current.schedule('a'))
    advance(20_000)
    act(() => result.current.schedule('a'))

    advance(29_999)
    expect(onMove).not.toHaveBeenCalled()

    advance(1)
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('pausedAll stops every timer, and they restart from 30 s when it ends', () => {
    const { result, rerender } = setup()
    act(() => result.current.schedule('a'))
    act(() => result.current.schedule('b'))
    advance(20_000)

    rerender({ pausedAll: true, pausedId: null })
    advance(60_000)
    expect(onMove).not.toHaveBeenCalled()

    rerender({ pausedAll: false, pausedId: null })
    advance(29_999)
    expect(onMove).not.toHaveBeenCalled()

    advance(1)
    expect(onMove.mock.calls).toEqual([['a'], ['b']])
  })

  it('pausedId pauses only that id; others still fire', () => {
    const { result, rerender } = setup()
    act(() => result.current.schedule('a'))
    act(() => result.current.schedule('b'))
    advance(10_000)

    rerender({ pausedAll: false, pausedId: 'a' })
    advance(20_000)
    expect(onMove.mock.calls).toEqual([['b']])

    advance(60_000)
    expect(onMove.mock.calls).toEqual([['b']])

    rerender({ pausedAll: false, pausedId: null })
    advance(30_000)
    expect(onMove.mock.calls).toEqual([['b'], ['a']])
  })

  it('moving pausedId from one id to another restarts the first and pauses the second', () => {
    const { result, rerender } = setup()
    act(() => result.current.schedule('a'))
    act(() => result.current.schedule('b'))
    rerender({ pausedAll: false, pausedId: 'a' })
    advance(10_000)

    rerender({ pausedAll: false, pausedId: 'b' })
    advance(29_999)
    expect(onMove).not.toHaveBeenCalled()

    advance(1)
    expect(onMove.mock.calls).toEqual([['a']])

    advance(60_000)
    expect(onMove.mock.calls).toEqual([['a']])
  })

  it('an id scheduled while paused fires 30 s after the pause ends', () => {
    const { result, rerender } = setup({ pausedAll: true, pausedId: null })
    act(() => result.current.schedule('a'))
    advance(60_000)
    expect(onMove).not.toHaveBeenCalled()

    rerender({ pausedAll: false, pausedId: null })
    advance(29_999)
    expect(onMove).not.toHaveBeenCalled()
    advance(1)
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('an id scheduled while its own pausedId applies fires 30 s after that pause ends', () => {
    const { result, rerender } = setup({ pausedAll: false, pausedId: 'a' })
    act(() => result.current.schedule('a'))
    advance(60_000)
    expect(onMove).not.toHaveBeenCalled()

    rerender({ pausedAll: false, pausedId: null })
    advance(30_000)
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('cancel prevents that id from firing', () => {
    const { result } = setup()
    act(() => result.current.schedule('a'))
    act(() => result.current.schedule('b'))
    act(() => result.current.cancel('a'))

    advance(30_000)
    expect(onMove.mock.calls).toEqual([['b']])
  })

  it('cancel drops a paused entry so it does not fire after the pause', () => {
    const { result, rerender } = setup({ pausedAll: true, pausedId: null })
    act(() => result.current.schedule('a'))
    act(() => result.current.cancel('a'))

    rerender({ pausedAll: false, pausedId: null })
    advance(30_000)
    expect(onMove).not.toHaveBeenCalled()
  })

  it('cancelAll prevents every id from firing', () => {
    const { result } = setup()
    act(() => result.current.schedule('a'))
    act(() => result.current.schedule('b'))
    act(() => result.current.cancelAll())

    advance(30_000)
    expect(onMove).not.toHaveBeenCalled()
  })

  it('clears timers on unmount', () => {
    const { result, unmount } = setup()
    act(() => result.current.schedule('a'))
    unmount()

    advance(30_000)
    expect(onMove).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('calls the latest onMove callback', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(
      ({ cb }: { cb: (id: string) => void }) => useMoveOpenedToEnd({ onMove: cb, pausedAll: false, pausedId: null }),
      { initialProps: { cb: first } },
    )
    act(() => result.current.schedule('a'))
    rerender({ cb: second })

    advance(30_000)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledExactlyOnceWith('a')
  })
})
