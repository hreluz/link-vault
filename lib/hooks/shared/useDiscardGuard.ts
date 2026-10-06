'use client'

import { useState } from 'react'

// Guards closing a form that has unsaved changes: with nothing changed, requestClose
// closes straight away; otherwise it asks first, and the caller renders a confirm
// prompt while `confirming` is true.
export function useDiscardGuard(hasChanges: boolean, onClose: () => void) {
  const [confirming, setConfirming] = useState(false)

  function requestClose() {
    if (hasChanges) setConfirming(true)
    else onClose()
  }

  function keepEditing() {
    setConfirming(false)
  }

  function discard() {
    setConfirming(false)
    onClose()
  }

  return { confirming, requestClose, keepEditing, discard }
}
