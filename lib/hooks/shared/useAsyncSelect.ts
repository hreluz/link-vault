'use client'

import { useRef, useState, useTransition } from 'react'
import type { ToggleResult } from './useAsyncToggle'

export type AsyncSelect<T> = {
  value: T
  error: string | null
  isPending: boolean
  select: (next: T) => void
}

/**
 * Generic optimistic N-ary picker backed by a server action: applies `next`
 * immediately (instant feedback matters for a visual picker like a color
 * swatch), rolling back to the previous value if the action fails.
 */
export function useAsyncSelect<T>(
  initialValue: T,
  action: (value: T) => Promise<ToggleResult>,
): AsyncSelect<T> {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  // Chains every action() call after the previous one settles, so rapid
  // successive select()s (e.g. picking two swatches within a moment of each
  // other) always reach the server in the order they were issued. Without
  // this, an earlier call's network round-trip can resolve *after* a later
  // one's, silently overwriting the database with the stale value even
  // though the UI already shows the newer pick.
  const chainRef = useRef<Promise<unknown>>(Promise.resolve())

  function select(next: T) {
    if (next === value) return
    const previous = value
    setError(null)
    setValue(next)
    // The chained callback must never itself reject, or chainRef.current
    // would stay rejected forever and silently stop running future picks.
    const run = chainRef.current.then(async () => {
      try {
        const result = await action(next)
        if (!result.success) {
          setError(result.error)
          setValue(previous)
        }
      } catch {
        setError('Something went wrong. Please try again.')
        setValue(previous)
      }
    })
    chainRef.current = run
    startTransition(async () => {
      await run
    })
  }

  return { value, error, isPending, select }
}
