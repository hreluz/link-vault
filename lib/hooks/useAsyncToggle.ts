'use client'

import { useState, useTransition } from 'react'

export type ToggleResult = { success: true } | { success: false; error: string }

export type AsyncToggle = {
  enabled: boolean
  error: string | null
  isPending: boolean
  toggle: () => void
}

/**
 * Generic optimistic on/off switch backed by a server action: flips `enabled`
 * only after `toggleAction` resolves successfully, otherwise surfaces `error`
 * and leaves `enabled` unchanged. Domain-agnostic — not tied to any particular setting.
 */
export function useAsyncToggle(
  initialEnabled: boolean,
  toggleAction: (enabled: boolean) => Promise<ToggleResult>,
): AsyncToggle {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setError(null)
    startTransition(async () => {
      const result = await toggleAction(next)
      if (!result.success) {
        setError(result.error)
        return
      }
      setEnabled(next)
    })
  }

  return { enabled, error, isPending, toggle }
}
