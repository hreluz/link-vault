'use client'

import { useCallback } from 'react'

const SCROLL_DURATION_MS = 200
// A free-spinning mouse wheel can keep sending real `wheel` events for a
// while after the hand stops touching it -- indistinguishable from a fresh
// scroll -- so instead of guessing a fixed wait, keep absorbing input and
// only let go once it's actually gone quiet.
const QUIET_MS = 300
const MAX_HOLD_MS = 4000

export function useScrollToTop() {
  return useCallback(() => {
    const start = window.scrollY
    if (start === 0) return

    let lastInputAt = performance.now()
    const absorbInput = (e: Event) => {
      e.preventDefault()
      lastInputAt = performance.now()
    }
    window.addEventListener('wheel', absorbInput, { passive: false })
    window.addEventListener('touchmove', absorbInput, { passive: false })

    const startTime = performance.now()

    function step(now: number) {
      const progress = Math.min((now - startTime) / SCROLL_DURATION_MS, 1)
      window.scrollTo(0, start * (1 - progress))

      const quiet = progress === 1 && now - lastInputAt >= QUIET_MS
      const timedOut = now - startTime >= MAX_HOLD_MS

      if (quiet || timedOut) {
        window.removeEventListener('wheel', absorbInput)
        window.removeEventListener('touchmove', absorbInput)
      } else {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }, [])
}
