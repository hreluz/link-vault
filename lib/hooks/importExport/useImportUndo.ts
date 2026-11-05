'use client'

import { useCallback, useRef, useState } from 'react'
import type { ImportRowOutcome } from '@/lib/services/links'
import { deleteImportedLinks, removeUnusedImportCreations } from '@/lib/services/importExport/undoImport'

export type ImportUndoState =
  | { phase: 'idle' }
  | { phase: 'confirming' }
  | { phase: 'deleting' }
  | { phase: 'done'; deleted: number; tags: number; categories: number }
  /** Links not (all) deleted; retry re-runs both steps. */
  | { phase: 'delete_error' }
  /** Links gone; retry re-runs the cleanup only. */
  | { phase: 'cleanup_error'; deleted: number }

type Collected = { linkIds: string[]; favorites: number; tagIds: string[]; categoryIds: string[] }

const emptyCollected = (): Collected => ({ linkIds: [], favorites: 0, tagIds: [], categoryIds: [] })

/** What one import run saved and created, and the "Undo this import" flow over it.
 *  Lives in memory only: once the modal closes (or the page reloads) the run can't be undone. */
export function useImportUndo({ onTagsChanged }: { onTagsChanged: () => void }) {
  // A ref, because outcomes and creations arrive from async callbacks mid-import.
  const collectedRef = useRef<Collected>(emptyCollected())
  // Render copies of the counts the modal shows.
  const [linkCount, setLinkCount] = useState(0)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [state, setState] = useState<ImportUndoState>({ phase: 'idle' })
  const busyRef = useRef(false)

  const reset = useCallback(() => {
    collectedRef.current = emptyCollected()
    setLinkCount(0)
    setFavoriteCount(0)
    setState({ phase: 'idle' })
  }, [])

  const recordOutcome = useCallback((outcome: ImportRowOutcome) => {
    if (outcome.status !== 'imported') return
    const collected = collectedRef.current
    collected.linkIds.push(outcome.id)
    if (outcome.isFavorite) collected.favorites++
    setLinkCount(collected.linkIds.length)
    setFavoriteCount(collected.favorites)
  }, [])

  const recordCreate = useCallback((kind: 'tag' | 'category', id: string) => {
    const collected = collectedRef.current
    if (kind === 'tag') collected.tagIds.push(id)
    else collected.categoryIds.push(id)
  }, [])

  const requestUndo = useCallback(() => {
    if (collectedRef.current.linkIds.length === 0) return
    setState(s => (s.phase === 'idle' ? { phase: 'confirming' } : s))
  }, [])

  const cancelUndo = useCallback(() => {
    setState(s => (s.phase === 'confirming' ? { phase: 'idle' } : s))
  }, [])

  async function runCleanup(deleted: number) {
    const { tagIds, categoryIds } = collectedRef.current
    const removed = await removeUnusedImportCreations({ tagIds, categoryIds })
    // Link counts changed even when the cleanup failed, so the tags cache is stale either way.
    onTagsChanged()
    setState(removed
      ? { phase: 'done', deleted, tags: removed.tags, categories: removed.categories }
      : { phase: 'cleanup_error', deleted })
  }

  async function run(step: () => Promise<void>) {
    if (busyRef.current) return
    busyRef.current = true
    setState({ phase: 'deleting' })
    try {
      await step()
    } finally {
      busyRef.current = false
    }
  }

  function confirmUndo() {
    if (state.phase !== 'confirming' && state.phase !== 'delete_error') return
    void run(async () => {
      const { linkIds } = collectedRef.current
      const result = await deleteImportedLinks(linkIds)
      if (result === null) {
        setState({ phase: 'delete_error' })
        return
      }
      // A retry after a partial failure only finds what was left, so report the whole run.
      await runCleanup(linkIds.length)
    })
  }

  function retryCleanup() {
    if (state.phase !== 'cleanup_error') return
    const { deleted } = state
    void run(() => runCleanup(deleted))
  }

  return {
    undoLinkCount: linkCount,
    undoFavoriteCount: favoriteCount,
    undoState: state,
    resetUndo: reset,
    recordUndoOutcome: recordOutcome,
    recordUndoCreate: recordCreate,
    requestUndo,
    cancelUndo,
    confirmUndo,
    /** Retry after `delete_error` (both steps). */
    retryUndo: confirmUndo,
    /** Retry after `cleanup_error` (cleanup only, links untouched). */
    retryUndoCleanup: retryCleanup,
  }
}
