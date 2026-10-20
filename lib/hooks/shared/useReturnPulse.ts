'use client'

import { useEffect, useState } from 'react'

const PULSE_MS = 1500

// True for a moment each time the tab becomes visible again, while `active`.
// Used to draw the eye back to the link the user just opened in a new tab.
export function useReturnPulse(active: boolean) {
  const [pulsing, setPulsing] = useState(false)

  useEffect(() => {
    if (!active) return
    let timer: ReturnType<typeof setTimeout> | null = null

    function handleVisibility() {
      if (document.visibilityState !== 'visible') return
      setPulsing(true)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setPulsing(false), PULSE_MS)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (timer) clearTimeout(timer)
      setPulsing(false)
    }
  }, [active])

  return pulsing
}
