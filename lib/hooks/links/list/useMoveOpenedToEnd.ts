'use client'

import { useCallback, useEffect, useRef } from 'react'

export const MOVE_TO_END_DELAY_MS = 30_000

type Timer = ReturnType<typeof setTimeout>

/**
 * One 30 s timer per opened link; when it ends, `onMove(id)` is called.
 * While a pause applies to a link (`pausedAll`, or `pausedId === id`) its
 * timer is stopped but the link stays pending; when the pause ends it gets a
 * fresh 30 s. Keeps running while the tab is hidden (plain `setTimeout`).
 */
export function useMoveOpenedToEnd({
  onMove,
  pausedAll,
  pausedId,
}: {
  onMove: (id: string) => void
  pausedAll: boolean
  pausedId: string | null
}) {
  const onMoveRef = useRef(onMove)
  useEffect(() => { onMoveRef.current = onMove })

  // id → running timer, or null while paused.
  const pendingRef = useRef(new Map<string, Timer | null>())
  const pausedAllRef = useRef(pausedAll)
  const pausedIdRef = useRef(pausedId)

  const start = useCallback((id: string) => {
    const pending = pendingRef.current
    const existing = pending.get(id)
    if (existing) clearTimeout(existing)
    if (pausedAllRef.current || pausedIdRef.current === id) {
      pending.set(id, null)
      return
    }
    pending.set(id, setTimeout(() => {
      pending.delete(id)
      onMoveRef.current(id)
    }, MOVE_TO_END_DELAY_MS))
  }, [])

  useEffect(() => {
    pausedAllRef.current = pausedAll
    pausedIdRef.current = pausedId
    for (const [id, timer] of pendingRef.current) {
      const paused = pausedAll || pausedId === id
      if (paused && timer) {
        clearTimeout(timer)
        pendingRef.current.set(id, null)
      } else if (!paused && !timer) {
        start(id)
      }
    }
  }, [pausedAll, pausedId, start])

  const cancel = useCallback((id: string) => {
    const timer = pendingRef.current.get(id)
    if (timer) clearTimeout(timer)
    pendingRef.current.delete(id)
  }, [])

  const cancelAll = useCallback(() => {
    for (const timer of pendingRef.current.values()) {
      if (timer) clearTimeout(timer)
    }
    pendingRef.current.clear()
  }, [])

  useEffect(() => cancelAll, [cancelAll])

  return { schedule: start, cancel, cancelAll }
}
