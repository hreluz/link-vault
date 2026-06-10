// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import SwipeableCard from '@/components/SwipeableCard'

// ── helpers ───────────────────────────────────────────────────────────────────

// jsdom doesn't expose the Touch constructor globally, so build events from plain Event + touches property
function dispatchTouch(el: Element, type: string, x: number, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', {
    value: type === 'touchend' ? [] : [{ clientX: x, clientY: y, identifier: 1, target: el }],
  })
  el.dispatchEvent(event)
}

function swipe(el: Element, startX: number, endX: number, startY = 0, endY = 0) {
  dispatchTouch(el, 'touchstart', startX, startY)
  dispatchTouch(el, 'touchmove', endX, endY)
  dispatchTouch(el, 'touchend', endX, endY)
}

function getInnerDiv(container: HTMLElement): HTMLElement {
  // Structure: outer div > [red-bg div, inner div]
  return container.firstElementChild!.children[1] as HTMLElement
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.useRealTimers(); cleanup() })

// ── tests ─────────────────────────────────────────────────────────────────────

describe('SwipeableCard', () => {
  it('renders children', () => {
    const { getByText } = render(<SwipeableCard><span>hello</span></SwipeableCard>)

    expect(getByText('hello')).not.toBeNull()
  })

  it('calls onSwipeDelete after a left swipe past the threshold', () => {
    const onDelete = vi.fn()
    const { container } = render(<SwipeableCard onSwipeDelete={onDelete}><div /></SwipeableCard>)
    const inner = getInnerDiv(container)
    // jsdom offsetWidth = 0 → threshold = 0; any leftward move triggers delete
    swipe(inner, 200, 50)

    vi.advanceTimersByTime(250)

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('does not call onSwipeDelete when swipe is below the threshold', () => {
    const onDelete = vi.fn()
    const { container } = render(<SwipeableCard onSwipeDelete={onDelete}><div /></SwipeableCard>)
    const inner = getInnerDiv(container)
    // Give the element a real width so threshold is non-trivial (40% of 300 = 120px)
    Object.defineProperty(inner, 'offsetWidth', { configurable: true, get: () => 300 })
    swipe(inner, 200, 150) // only 50px left — below 120px threshold

    vi.advanceTimersByTime(250)

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('does not call onSwipeDelete for a right swipe', () => {
    const onDelete = vi.fn()
    const { container } = render(<SwipeableCard onSwipeDelete={onDelete}><div /></SwipeableCard>)
    const inner = getInnerDiv(container)
    swipe(inner, 50, 200) // right swipe

    vi.advanceTimersByTime(250)

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('does not call onSwipeDelete for a predominantly vertical swipe', () => {
    const onDelete = vi.fn()
    const { container } = render(<SwipeableCard onSwipeDelete={onDelete}><div /></SwipeableCard>)
    const inner = getInnerDiv(container)
    swipe(inner, 100, 80, 100, 10) // dx = -20, dy = -90 → vertical

    vi.advanceTimersByTime(250)

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('does not throw when onSwipeDelete is not provided', () => {
    const { container } = render(<SwipeableCard><div /></SwipeableCard>)
    const inner = getInnerDiv(container)

    expect(() => swipe(inner, 200, 50)).not.toThrow()
    vi.advanceTimersByTime(250)
  })
})
