'use client'

import { useRef } from 'react'
import type { MouseEvent } from 'react'

// Close only when the press *and* the release both land on the backdrop. A plain
// target check on click isn't enough: a text-selection drag that starts inside the
// modal and ends on the overlay fires its click on the backdrop (the common
// ancestor of the mousedown and mouseup targets) and would close the modal.
export function useBackdropClose(onClose: () => void) {
  const pressedOnBackdrop = useRef(false)
  return {
    onMouseDown: (e: MouseEvent) => { pressedOnBackdrop.current = e.target === e.currentTarget },
    onClick: (e: MouseEvent) => {
      if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose()
      pressedOnBackdrop.current = false
    },
  }
}
