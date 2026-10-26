'use client'

import { useCallback, useEffect, useRef } from 'react'
import { logMove } from '@/lib/utils/moveLog'

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
      logMove('queued-paused', {
        id, pausedAll: pausedAllRef.current, pausedId: pausedIdRef.current, pendingCount: pending.size,
      })
      return
    }
    pending.set(id, setTimeout(() => {
      pending.delete(id)
      logMove('fired', { id, pendingCount: pending.size })
      onMoveRef.current(id)
    }, MOVE_TO_END_DELAY_MS))
    logMove(existing ? 'restarted' : 'started', { id, delayMs: MOVE_TO_END_DELAY_MS, pendingCount: pending.size })
  }, [])

  useEffect(() => {
    pausedAllRef.current = pausedAll
    pausedIdRef.current = pausedId
    for (const [id, timer] of pendingRef.current) {
      const paused = pausedAll || pausedId === id
      if (paused && timer) {
        clearTimeout(timer)
        pendingRef.current.set(id, null)
        logMove('paused', { id, reason: pausedAll ? 'all' : 'menu' })
      } else if (!paused && !timer) {
        logMove('resumed', { id })
        start(id)
      }
    }
  }, [pausedAll, pausedId, start])

  const cancel = useCallback((id: string, reason = 'unknown') => {
    const pending = pendingRef.current
    if (!pending.has(id)) return
    const timer = pending.get(id)
    if (timer) clearTimeout(timer)
    pending.delete(id)
    logMove('cancelled', { id, reason, pendingCount: pending.size })
  }, [])

  const cancelAll = useCallback((reason = 'unknown') => {
    const pending = pendingRef.current
    if (pending.size === 0) return
    const ids = [...pending.keys()]
    for (const timer of pending.values()) {
      if (timer) clearTimeout(timer)
    }
    pending.clear()
    logMove('cancelled-all', { ids, reason })
  }, [])

  useEffect(() => () => cancelAll('unmount'), [cancelAll])

  return { schedule: start, cancel, cancelAll }
}
