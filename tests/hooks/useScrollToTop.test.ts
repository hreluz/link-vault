// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScrollToTop } from '@/lib/hooks/useScrollToTop'

function setScrollY(value: number) {
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(value)
}

function fireWheel(): Event {
  const event = new Event('wheel', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] })
  window.scrollTo = vi.fn()
})

afterEach(() => {
  // The hook isn't tied to React's lifecycle -- it manages its own
  // rAF loop via closures. Let any pending hold run to completion so it
  // removes its own wheel/touchmove listeners before the fake timers (and
  // the window they're attached to) go away, otherwise a listener left
  // over from one test can leak into the next.
  act(() => vi.advanceTimersByTime(5000))
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useScrollToTop', () => {
  it('does nothing when already at the top', () => {
    setScrollY(0)
    const { result } = renderHook(() => useScrollToTop())

    act(() => result.current())
    act(() => vi.advanceTimersByTime(1000))

    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('animates scrollY down to 0', () => {
    setScrollY(1000)
    const { result } = renderHook(() => useScrollToTop())

    act(() => result.current())
    act(() => vi.advanceTimersByTime(220)) // a little past the 200ms animation so it lands on progress === 1

    const lastCall = vi.mocked(window.scrollTo).mock.calls.at(-1)
    expect(lastCall).toEqual([0, 0])
  })

  it('absorbs a wheel event that arrives mid-animation', () => {
    setScrollY(500)
    const { result } = renderHook(() => useScrollToTop())

    act(() => result.current())
    act(() => vi.advanceTimersByTime(50))

    let event!: Event
    act(() => { event = fireWheel() })

    expect(event.defaultPrevented).toBe(true)
  })

  it('releases input once the animation finishes and stays quiet', () => {
    setScrollY(500)
    const { result } = renderHook(() => useScrollToTop())

    act(() => result.current())
    // past the 200ms animation + 300ms quiet period, no further input
    act(() => vi.advanceTimersByTime(200 + 300 + 20))

    let event!: Event
    act(() => { event = fireWheel() })

    expect(event.defaultPrevented).toBe(false)
  })

  it('keeps absorbing input for as long as it keeps arriving', () => {
    setScrollY(500)
    const { result } = renderHook(() => useScrollToTop())

    act(() => result.current())

    // Fire wheel events every 100ms, well past the 500ms a fixed hold would
    // have released at, to prove the hold is adaptive rather than a timer.
    for (let i = 0; i < 15; i++) {
      act(() => vi.advanceTimersByTime(100))
      let event!: Event
      act(() => { event = fireWheel() })
      expect(event.defaultPrevented).toBe(true)
    }
  })

  it('gives up after the hard cap even if input never stops', () => {
    setScrollY(500)
    const { result } = renderHook(() => useScrollToTop())

    act(() => result.current())

    // Keep input flowing continuously past the 4000ms hard cap.
    for (let i = 0; i < 41; i++) {
      act(() => vi.advanceTimersByTime(100))
      act(() => { fireWheel() })
    }

    let event!: Event
    act(() => { event = fireWheel() })

    expect(event.defaultPrevented).toBe(false)
  })
})
