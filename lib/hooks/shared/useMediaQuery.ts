'use client'

import { useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query currently matches, kept in sync as it changes.
 * Server render and hydration report false (mobile-first), then the real value.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}
