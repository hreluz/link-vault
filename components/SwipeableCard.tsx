'use client'

import { useRef, useEffect, useState } from 'react'

interface Props {
  onSwipeDelete?: () => void
  children: React.ReactNode
}

// How far an open card slides left to reveal its Delete button.
export const REVEAL_PX = 88
// Fraction of the card's width a left swipe must pass to snap it open.
const OPEN_THRESHOLD = 0.4

// Closes whichever card is currently open, so only one stays open at a time.
let closeOpenCard: (() => void) | null = null

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Swipe left past 40% of the card's width to snap it open by REVEAL_PX and reveal a
// Delete button underneath (the iOS Mail pattern). Nothing is deleted until that
// button is tapped. A short swipe, a swipe back to the right, a tap on the card or
// a touch outside it closes it again.
export default function SwipeableCard({ onSwipeDelete, children }: Props) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const onSwipeDeleteRef = useRef(onSwipeDelete)
  const closeRef = useRef<() => void>(() => {})
  const [open, setOpen] = useState(false)

  useEffect(() => { onSwipeDeleteRef.current = onSwipeDelete })

  useEffect(() => {
    const el = innerRef.current
    const outer = outerRef.current
    if (!el || !outer) return

    let isOpen = false
    let startX = 0
    let startY = 0
    let baseX = 0
    let currentX = 0
    let isDragging = false
    let isHorizontal = false
    let outsideTimer: ReturnType<typeof setTimeout> | undefined

    function moveTo(x: number, animate: boolean) {
      el!.style.transition = animate && !prefersReducedMotion() ? 'transform 0.25s ease' : 'none'
      el!.style.transform = `translateX(${x}px)`
    }

    // A touch anywhere outside this card closes it. Registered on the next tick so
    // the touch that opened the card can't close it again.
    function onOutsideTouch(e: Event) {
      if (!outer!.contains(e.target as Node)) close()
    }

    function snapOpen() {
      if (closeOpenCard && closeOpenCard !== close) closeOpenCard()
      closeOpenCard = close
      isOpen = true
      setOpen(true)
      moveTo(-REVEAL_PX, true)
      clearTimeout(outsideTimer)
      outsideTimer = setTimeout(() => document.addEventListener('touchstart', onOutsideTouch, true), 0)
    }

    function close() {
      if (closeOpenCard === close) closeOpenCard = null
      clearTimeout(outsideTimer)
      document.removeEventListener('touchstart', onOutsideTouch, true)
      moveTo(0, true)
      if (!isOpen) return
      isOpen = false
      setOpen(false)
    }
    closeRef.current = close

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      baseX = isOpen ? -REVEAL_PX : 0
      currentX = baseX
      isDragging = true
      isHorizontal = false
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDragging) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      if (!isHorizontal) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
        if (Math.abs(dy) > Math.abs(dx)) {
          isDragging = false
          return
        }
        isHorizontal = true
      }

      e.preventDefault()
      // Follows the finger leftwards; never slides right of its resting place.
      currentX = Math.min(0, baseX + dx)
      moveTo(currentX, false)
    }

    function onTouchEnd() {
      if (!isDragging) return
      isDragging = false
      // A tap (no horizontal drag) is handled by onClickCapture below.
      if (!isHorizontal) return

      const threshold = el!.offsetWidth * OPEN_THRESHOLD
      if (currentX < -threshold && onSwipeDeleteRef.current) snapOpen()
      else close()
    }

    // A tap on an open card only closes it; it doesn't open the link underneath.
    function onClickCapture(e: MouseEvent) {
      if (!isOpen) return
      e.preventDefault()
      e.stopPropagation()
      close()
    }

    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('click', onClickCapture, true)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('click', onClickCapture, true)
      clearTimeout(outsideTimer)
      document.removeEventListener('touchstart', onOutsideTouch, true)
      if (closeOpenCard === close) closeOpenCard = null
    }
  }, []) // run once — callbacks are always current via refs

  function handleDelete() {
    closeRef.current()
    onSwipeDeleteRef.current?.()
  }

  return (
    <div ref={outerRef} className="relative overflow-hidden rounded-2xl shadow-sm ring-1 ring-surface-200 transition hover:shadow-md hover:ring-surface-300 dark:ring-surface-700 dark:hover:ring-surface-600">
      {/* Revealed by the swipe. Hidden from assistive tech and the Tab order while
          the card is closed; the card's own Delete button is the accessible path. */}
      <div className="pointer-events-none absolute inset-0 flex justify-end bg-red-100 dark:bg-red-900/40">
        <button
          type="button"
          aria-label="Delete link"
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          onClick={handleDelete}
          className="focus-ring pointer-events-auto flex h-full items-center justify-center bg-red-600 text-2xl text-white"
          style={{ width: REVEAL_PX }}
        >
          <span aria-hidden="true">🗑️</span>
        </button>
      </div>
      <div ref={innerRef} className="relative h-full">
        {children}
      </div>
    </div>
  )
}
