'use client'

import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useLinkModals } from './useLinkModals'
import { useLinks } from './useLinks'
import { useLinkFilters } from './useLinkFilters'
import { useMoveOpenedToEnd } from './useMoveOpenedToEnd'
import type { LinkWithTags } from '@/lib/services/links'
import { DEFAULT_MOVE_TO_END_DELAY_SECONDS } from '@/lib/services/userPreferences'
import type { LinkStatus } from '@/lib/types/database'
import { logMove, rememberMoveTitle } from '@/lib/utils/moveLog'

export function useLinkList(autoFetchDefault = true, moveToEndDelaySeconds = DEFAULT_MOVE_TO_END_DELAY_SECONDS) {
  const modals = useLinkModals()
  const filters = useLinkFilters()
  const {
    links, loadedLinks, totalCount, unreadCount, hasMore, loading, loadingMore, loadMore, refresh, refreshing,
    imageStateById, handleImageError,
    handleStatusChange: changeStatus,
    handleEdit: editLink,
    handleDelete: deleteLink,
    handleFavoriteToggle: toggleFavorite,
    handleCreate,
    handleMoveToEnd,
    lastMove,
    undoingMove,
    handleUndoMove: undoMove,
    clearLastMove,
  } = useLinks(filters.filterParams)
  const { addToast } = useToast()
  const { refetchTags } = useTagsContext()
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null)
  // `refreshing` only turns true once page 1 starts loading, so a ref guards
  // the private-tag re-read that runs first against a second click.
  const refreshInFlightRef = useRef(false)

  // Opened links move to the end of the list after the user's delay. Ids still waiting
  // are tracked here so a link that leaves the list drops its pending move.
  const pendingMoveIdsRef = useRef(new Set<string>())
  const moveOpened = useMoveOpenedToEnd({
    onMove: id => {
      pendingMoveIdsRef.current.delete(id)
      handleMoveToEnd(id)
    },
    pausedAll: modals.editingLink !== null,
    pausedId: modals.activeLink?.id ?? null,
    delayMs: moveToEndDelaySeconds * 1000,
  })
  const { cancel: cancelMove, cancelAll: cancelAllMoves } = moveOpened

  function cancelPendingMoves() {
    pendingMoveIdsRef.current.clear()
    cancelAllMoves('refresh')
    clearLastMove()
  }

  // A filter/search/sort change rebuilds the list, so pending moves and the
  // undo slot are dropped.
  const filterKey = JSON.stringify(filters.filterParams)
  useEffect(() => {
    pendingMoveIdsRef.current.clear()
    cancelAllMoves('filter/sort/search change')
    clearLastMove()
  }, [filterKey, cancelAllMoves, clearLastMove])

  const lastMovedId = lastMove?.id ?? null
  useEffect(() => {
    const loadedIds = new Set(loadedLinks.map(l => l.id))
    for (const id of pendingMoveIdsRef.current) {
      if (!loadedIds.has(id)) {
        pendingMoveIdsRef.current.delete(id)
        cancelMove(id, 'left list')
      }
    }
    if (lastMovedId !== null && !loadedIds.has(lastMovedId)) clearLastMove()
  }, [loadedLinks, cancelMove, lastMovedId, clearLastMove])

  const lastMovedLink = lastMovedId === null ? null : loadedLinks.find(l => l.id === lastMovedId) ?? null

  // Undoing also drops a pending re-move, so the card doesn't jump away again.
  function handleUndoMove() {
    if (!lastMove) return
    pendingMoveIdsRef.current.delete(lastMove.id)
    cancelMove(lastMove.id, 'undo')
    undoMove()
  }

  function handleStatusChange(id: string, status: LinkStatus) {
    changeStatus(id, status)
    modals.setActiveLink(prev => prev?.id === id ? { ...prev, status } : prev)
  }

  function handleEdit(updated: LinkWithTags) {
    editLink(updated)
    modals.setEditingLink(null)
  }

  function handleDeleteById(id: string) {
    deleteLink(id)
  }

  function handleLinkOpen(id: string, currentStatus: LinkStatus) {
    rememberMoveTitle(loadedLinks.find(l => l.id === id))
    logMove('opened', { id, status: currentStatus })
    setLastOpenedId(id)
    if (currentStatus === 'unread') changeStatus(id, 'watching')
    pendingMoveIdsRef.current.add(id)
    moveOpened.schedule(id)
  }

  // Moves right away and drops any pending timer, so the card doesn't move twice.
  function handleSendToEnd(id: string) {
    pendingMoveIdsRef.current.delete(id)
    cancelMove(id, 'sent to end')
    handleMoveToEnd(id)
  }

  function handleFavoriteToggle(id: string) {
    toggleFavorite(id)
    modals.setActiveLink(prev => prev?.id === id ? { ...prev, is_favorite: !prev.is_favorite } : prev)
  }

  // Reloads links, tags and categories in place -- never touches the vault
  // key or unlocked private tags, so no password prompt.
  async function handleRefresh() {
    if (refreshing || refreshInFlightRef.current) return
    refreshInFlightRef.current = true
    cancelPendingMoves()
    try {
      refetchTags()
      await refresh()
      setRefreshKey(k => k + 1)
    } catch {
      addToast('Failed to refresh links', 'destructive')
    } finally {
      refreshInFlightRef.current = false
    }
  }

  return {
    ...modals,
    ...filters,
    autoFetchDefault,
    links,
    totalCount,
    unreadCount,
    hasMore,
    loading,
    loadingMore,
    loadMore,
    refreshing,
    refreshKey,
    handleRefresh,
    handleStatusChange,
    handleLinkOpen,
    handleSendToEnd,
    lastOpenedId,
    imageStateById,
    handleImageError,
    lastMovedLink,
    undoingMove,
    handleUndoMove,
    handleEdit,
    handleDeleteById,
    handleFavoriteToggle,
    handleCreate,
    addToast,
  }
}
