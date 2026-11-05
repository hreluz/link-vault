// @vitest-environment jsdom
// SPEC 35: a left swipe past 40% snaps the card open to reveal a Delete button;
// nothing is deleted until that button is tapped.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import SwipeableCard, { REVEAL_PX } from '@/components/SwipeableCard'

// ── helpers ───────────────────────────────────────────────────────────────────

// jsdom doesn't expose the Touch constructor globally, so build events from plain Event + touches property
function dispatchTouch(el: Element | Document, type: string, x: number, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', {
    value: type === 'touchend' ? [] : [{ clientX: x, clientY: y, identifier: 1, target: el }],
  })
  act(() => { el.dispatchEvent(event) })
}

function swipe(el: Element, startX: number, endX: number, startY = 0, endY = 0) {
  dispatchTouch(el, 'touchstart', startX, startY)
  dispatchTouch(el, 'touchmove', endX, endY)
  dispatchTouch(el, 'touchend', endX, endY)
}

const WIDTH = 300 // threshold = 40% = 120px

// null renders the card with no onSwipeDelete handler.
function renderCard(onDelete: (() => void) | null = vi.fn(), label = 'card') {
  const utils = render(
    <SwipeableCard onSwipeDelete={onDelete ?? undefined}>
      <a href="#link" data-testid={`${label}-link`}>{label}</a>
    </SwipeableCard>,
  )
  const outer = utils.container.lastElementChild as HTMLElement
  const inner = outer.children[1] as HTMLElement
  Object.defineProperty(inner, 'offsetWidth', { configurable: true, get: () => WIDTH })
  const deleteButton = outer.querySelector<HTMLButtonElement>('button[aria-label="Delete link"]')!
  return { ...utils, outer, inner, deleteButton }
}

function isOpen(inner: HTMLElement) {
  return inner.style.transform === `translateX(-${REVEAL_PX}px)`
}

function isClosed(inner: HTMLElement) {
  return inner.style.transform === 'translateX(0px)'
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  cleanup()
  delete (window as { matchMedia?: unknown }).matchMedia
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('SwipeableCard', () => {
  it('renders children', () => {
    renderCard()

    expect(screen.getByText('card')).not.toBeNull()
  })

  it('snaps open by REVEAL_PX after a left swipe past 40%, without deleting', () => {
    const onDelete = vi.fn()
    const { inner, deleteButton } = renderCard(onDelete)

    swipe(inner, 250, 100) // 150px left > 120px threshold
    vi.runAllTimers()

    expect(isOpen(inner)).toBe(true)
    expect(deleteButton.getAttribute('aria-hidden')).toBe('false')
    expect(deleteButton.tabIndex).toBe(0)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('calls onSwipeDelete and closes when the revealed Delete button is tapped', () => {
    const onDelete = vi.fn()
    const { inner, deleteButton } = renderCard(onDelete)
    swipe(inner, 250, 100)

    fireEvent.click(deleteButton)

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(isClosed(inner)).toBe(true)
  })

  it('hides the Delete button from assistive tech and the Tab order while closed', () => {
    const { deleteButton } = renderCard()

    expect(deleteButton.getAttribute('aria-hidden')).toBe('true')
    expect(deleteButton.tabIndex).toBe(-1)
  })

  it('snaps back closed when the swipe is below the threshold', () => {
    const { inner } = renderCard()

    swipe(inner, 200, 150) // only 50px left

    expect(isClosed(inner)).toBe(true)
  })

  it('never opens on a right swipe', () => {
    const { inner } = renderCard()

    swipe(inner, 50, 200)

    expect(isClosed(inner)).toBe(true)
  })

  it('ignores a predominantly vertical swipe', () => {
    const { inner } = renderCard()

    swipe(inner, 100, 80, 100, 10) // dx = -20, dy = -90 → vertical

    expect(inner.style.transform).toBe('')
  })

  it('does not open without an onSwipeDelete handler', () => {
    const { inner } = renderCard(null)

    expect(() => swipe(inner, 250, 100)).not.toThrow()
    expect(isClosed(inner)).toBe(true)
  })

  it('closes on a swipe back to the right', () => {
    const { inner, deleteButton } = renderCard()
    swipe(inner, 250, 100)

    swipe(inner, 100, 200)

    expect(isClosed(inner)).toBe(true)
    expect(deleteButton.getAttribute('aria-hidden')).toBe('true')
  })

  it('closes on a short left swipe of an open card', () => {
    const { inner } = renderCard()
    swipe(inner, 250, 100)

    swipe(inner, 200, 190) // ends at -98px, short of -120px

    expect(isClosed(inner)).toBe(true)
  })

  it('closes on a tap on the card, without following the link underneath', () => {
    const { inner } = renderCard()
    swipe(inner, 250, 100)
    const onLinkClick = vi.fn()
    screen.getByTestId('card-link').addEventListener('click', onLinkClick)

    fireEvent.click(screen.getByTestId('card-link'))

    expect(isClosed(inner)).toBe(true)
    expect(onLinkClick).not.toHaveBeenCalled()
  })

  it('lets a tap on a closed card through to the link', () => {
    renderCard()
    const onLinkClick = vi.fn()
    screen.getByTestId('card-link').addEventListener('click', onLinkClick)

    fireEvent.click(screen.getByTestId('card-link'))

    expect(onLinkClick).toHaveBeenCalledTimes(1)
  })

  it('closes on a touch outside the card, but not on the touch that opened it', () => {
    const { inner } = renderCard()
    swipe(inner, 250, 100)

    // Same tick as the opening touch: the outside listener isn't registered yet.
    dispatchTouch(document.body, 'touchstart', 0, 0)
    expect(isOpen(inner)).toBe(true)

    vi.runAllTimers()
    dispatchTouch(document.body, 'touchstart', 0, 0)
    expect(isClosed(inner)).toBe(true)
  })

  it('stays open on a touch inside the card itself', () => {
    const { inner, deleteButton } = renderCard()
    swipe(inner, 250, 100)
    vi.runAllTimers()

    dispatchTouch(deleteButton, 'touchstart', 0, 0)

    expect(isOpen(inner)).toBe(true)
  })

  it('closes the previously open card when another one opens', () => {
    const first = renderCard(vi.fn(), 'first')
    const second = renderCard(vi.fn(), 'second')
    swipe(first.inner, 250, 100)

    swipe(second.inner, 250, 100)

    expect(isClosed(first.inner)).toBe(true)
    expect(isOpen(second.inner)).toBe(true)
  })

  it('animates the snap with a 0.25s transition', () => {
    const { inner } = renderCard()

    swipe(inner, 250, 100)

    expect(inner.style.transition).toBe('transform 0.25s ease')
  })

  it('snaps with no transition when reduced motion is preferred', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    const { inner } = renderCard()

    swipe(inner, 250, 100)

    expect(isOpen(inner)).toBe(true)
    expect(inner.style.transition).toBe('none')
  })
})
