// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { useInfiniteScrollSentinel } from '@/lib/hooks/shared/useInfiniteScrollSentinel'

type ObserverCallback = (entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[]) => void

let lastCallback: ObserverCallback | null = null
const observe = vi.fn()
const disconnect = vi.fn()

class FakeIntersectionObserver {
  constructor(callback: ObserverCallback) {
    lastCallback = callback
  }
  observe = observe
  disconnect = disconnect
  unobserve = vi.fn()
}

beforeEach(() => {
  lastCallback = null
  observe.mockClear()
  disconnect.mockClear()
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
})

afterEach(() => vi.unstubAllGlobals())

function Sentinel({ onIntersect, enabled }: { onIntersect: () => void; enabled: boolean }) {
  const ref = useInfiniteScrollSentinel(onIntersect, enabled)
  return <div ref={ref} data-testid="sentinel" />
}

describe('useInfiniteScrollSentinel', () => {
  it('does not observe when disabled', () => {
    render(<Sentinel onIntersect={vi.fn()} enabled={false} />)
    expect(observe).not.toHaveBeenCalled()
  })

  it('observes the sentinel element when enabled', () => {
    render(<Sentinel onIntersect={vi.fn()} enabled={true} />)
    expect(observe).toHaveBeenCalledOnce()
  })

  it('calls onIntersect when the sentinel becomes visible', () => {
    const onIntersect = vi.fn()
    render(<Sentinel onIntersect={onIntersect} enabled={true} />)

    lastCallback?.([{ isIntersecting: true }])

    expect(onIntersect).toHaveBeenCalledOnce()
  })

  it('does not call onIntersect when not intersecting', () => {
    const onIntersect = vi.fn()
    render(<Sentinel onIntersect={onIntersect} enabled={true} />)

    lastCallback?.([{ isIntersecting: false }])

    expect(onIntersect).not.toHaveBeenCalled()
  })

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<Sentinel onIntersect={vi.fn()} enabled={true} />)
    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('always calls the latest onIntersect callback without re-observing', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<Sentinel onIntersect={first} enabled={true} />)
    rerender(<Sentinel onIntersect={second} enabled={true} />)

    lastCallback?.([{ isIntersecting: true }])

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
    expect(observe).toHaveBeenCalledOnce()
  })
})
