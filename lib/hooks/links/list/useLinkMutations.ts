'use client'

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { toggleLinkFavorite, deleteLink, updateLinkStatus, markLinkMovedToEnd, type LinkWithTags, type LinkFilterParams } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '@/app/dashboard/config'
import { useToast } from '@/components/ToastProvider'
import { useTagsContext } from '@/lib/context/TagsContext'
import { matchesLocalFilters } from './linkFilterMatch'
import { logMove } from '@/lib/utils/moveLog'

/** The last saved move-to-end, kept so it can be undone. */
export interface LastMove {
  id: string
  index: number                    // index in rawLinks just before the move
  previousMovedAt: string | null   // moved_to_end_at before the move
  movedAt: string                  // moved_to_end_at set by the move
}

export function useLinkMutations(
  rawLinks: LinkWithTags[],
  setRawLinks: Dispatch<SetStateAction<LinkWithTags[]>>,
  filterParams: LinkFilterParams,
  { onMovedToEnd, onMoveUndone }: { onMovedToEnd: () => void; onMoveUndone: () => void },
) {
  const { addToast, dismissToast } = useToast()
  const { refetchTags } = useTagsContext()
  const [lastMove, setLastMove] = useState<LastMove | null>(null)
  const [undoingMove, setUndoingMove] = useState(false)
  // `undoingMove` only disables the button after a re-render, so a ref guards a double press.
  const undoInFlightRef = useRef(false)

  function pruneIfMismatched(ids: string[]) {
    setRawLinks(prev => prev.filter(l => !ids.includes(l.id) || matchesLocalFilters(l, filterParams)))
  }

  async function handleStatusChange(id: string, status: LinkStatus) {
    const previous = rawLinks.find(l => l.id === id)
    // Mirrors the DB trigger that clears moved_to_end_at when a link goes back to unread.
    setRawLinks(prev => prev.map(l => l.id === id
      ? { ...l, status, ...(status === 'unread' ? { moved_to_end_at: null } : {}) }
      : l))
    pruneIfMismatched([id])
    addToast(`Moved to ${STATUS_CONFIG[status].label}`)
    const ok = await updateLinkStatus(id, status)
    if (!ok && previous) {
      setRawLinks(prev => prev.map(l => l.id === id
        ? { ...l, status: previous.status, moved_to_end_at: previous.moved_to_end_at }
        : l))
      addToast('Failed to update status', 'destructive')
    }
  }

  function handleEdit(updated: LinkWithTags) {
    setRawLinks(prev => prev.map(l => l.id === updated.id ? updated : l))
    pruneIfMismatched([updated.id])
    addToast('Changes saved')
    refetchTags()
  }

  function handleDelete(id: string) {
    const snapshot = rawLinks.find(l => l.id === id)
    if (snapshot?.is_favorite) {
      addToast('Unfavorite to delete', 'destructive')
      return
    }
    setRawLinks(prev => prev.filter(l => l.id !== id))

    let cancelled = false

    const toastId = addToast('Link deleted, tap to undo', 'destructive', {
      duration: 3000,
      onClick: () => {
        cancelled = true
        if (snapshot) setRawLinks(prev => [snapshot, ...prev])
        dismissToast(toastId)
      },
    })

    setTimeout(async () => {
      if (cancelled) return
      const result = await deleteLink(id)
      if (result === 'blocked') {
        if (snapshot) setRawLinks(prev => [snapshot, ...prev])
        addToast('Unfavorite to delete', 'destructive')
      } else if (result === 'error') {
        if (snapshot) setRawLinks(prev => [snapshot, ...prev])
        addToast('Failed to delete link', 'destructive')
      }
    }, 2000)
  }

  async function handleFavoriteToggle(id: string) {
    const isFav = rawLinks.find(l => l.id === id)?.is_favorite
    setRawLinks(prev => prev.map(l => l.id === id ? { ...l, is_favorite: !l.is_favorite } : l))
    pruneIfMismatched([id])
    const ok = await toggleLinkFavorite(id, !isFav)
    if (!ok) {
      setRawLinks(prev => prev.map(l => l.id === id ? { ...l, is_favorite: !!isFav } : l))
      addToast('Failed to update favorite', 'destructive')
    } else {
      addToast(isFav ? 'Removed from favorites' : 'Added to favorites')
    }
  }

  async function handleMoveToEnd(id: string) {
    const index = rawLinks.findIndex(l => l.id === id)
    if (index === -1) {
      logMove('move-skipped', { id, reason: 'not loaded' })
      return
    }
    const previousMovedAt = rawLinks[index].moved_to_end_at
    const at = new Date().toISOString()

    setRawLinks(prev => {
      const link = prev.find(l => l.id === id)
      if (!link) return prev
      return [...prev.filter(l => l.id !== id), { ...link, moved_to_end_at: at }]
    })

    const ok = await markLinkMovedToEnd(id, at)
    if (ok) {
      logMove('move-saved', { id, fromIndex: index, previousMovedAt, movedAt: at })
      setLastMove({ id, index, previousMovedAt, movedAt: at })
      onMovedToEnd()
      return
    }
    logMove('move-failed', { id, fromIndex: index })
    setRawLinks(prev => {
      const link = prev.find(l => l.id === id)
      if (!link) return prev
      const rest = prev.filter(l => l.id !== id)
      const restoreAt = Math.min(index, rest.length)
      return [...rest.slice(0, restoreAt), { ...link, moved_to_end_at: previousMovedAt }, ...rest.slice(restoreAt)]
    })
    addToast('Failed to move link', 'destructive')
  }

  function handleCreate(link: LinkWithTags) {
    setRawLinks(prev => matchesLocalFilters(link, filterParams) ? [link, ...prev] : prev)
    refetchTags()
  }

  async function handleUndoMove(): Promise<boolean> {
    if (!lastMove || undoInFlightRef.current) return false
    const { id, index, previousMovedAt, movedAt } = lastMove
    if (!rawLinks.some(l => l.id === id)) {
      logMove('undo-skipped', { id, reason: 'not loaded' })
      return false
    }
    undoInFlightRef.current = true
    setUndoingMove(true)

    setRawLinks(prev => {
      const link = prev.find(l => l.id === id)
      if (!link) return prev
      const rest = prev.filter(l => l.id !== id)
      const restoreAt = Math.min(index, rest.length)
      return [...rest.slice(0, restoreAt), { ...link, moved_to_end_at: previousMovedAt }, ...rest.slice(restoreAt)]
    })

    const ok = await markLinkMovedToEnd(id, previousMovedAt)
    if (ok) {
      logMove('undo-saved', { id, toIndex: index, restoredMovedAt: previousMovedAt })
      setLastMove(null)
      onMoveUndone()
    } else {
      logMove('undo-failed', { id })
      setRawLinks(prev => {
        const link = prev.find(l => l.id === id)
        if (!link) return prev
        return [...prev.filter(l => l.id !== id), { ...link, moved_to_end_at: movedAt }]
      })
      addToast('Failed to undo move', 'destructive')
    }
    undoInFlightRef.current = false
    setUndoingMove(false)
    return ok
  }

  // Stable, since useLinkList calls it from effects.
  const clearLastMove = useCallback(() => setLastMove(null), [])

  return {
    handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle, handleMoveToEnd, handleCreate,
    lastMove, undoingMove, handleUndoMove, clearLastMove,
  }
}
