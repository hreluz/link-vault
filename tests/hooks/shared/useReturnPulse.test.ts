// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReturnPulse } from '@/lib/hooks/shared/useReturnPulse'

function setVisibility(state: DocumentVisibilityState) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state)
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useReturnPulse', () => {
  it('pulses when the tab becomes visible again, then stops', () => {
    const { result } = renderHook(() => useReturnPulse(true))
    expect(result.current).toBe(false)

    act(() => setVisibility('hidden'))
    expect(result.current).toBe(false)

    act(() => setVisibility('visible'))
    expect(result.current).toBe(true)

    act(() => vi.advanceTimersByTime(1500))
    expect(result.current).toBe(false)
  })

  it('does nothing while inactive', () => {
    const { result } = renderHook(() => useReturnPulse(false))

    act(() => setVisibility('visible'))

    expect(result.current).toBe(false)
  })

  it('stops pulsing when it becomes inactive mid-pulse', () => {
    const { result, rerender } = renderHook(({ active }) => useReturnPulse(active), {
      initialProps: { active: true },
    })

    act(() => setVisibility('visible'))
    expect(result.current).toBe(true)

    rerender({ active: false })
    expect(result.current).toBe(false)
  })
})
