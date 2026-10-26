'use client'

import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useLinkModals } from './useLinkModals'
import { useLinks } from './useLinks'
import { useLinkFilters } from './useLinkFilters'
import { useLinksSelection } from './useLinksSelection'
import { useMoveOpenedToEnd } from './useMoveOpenedToEnd'
import { getMatchingLinkIds, SELECT_ALL_MATCHING_CAP, type LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'

export function useLinkList(autoFetchDefault = true) {
  const modals = useLinkModals()
  const filters = useLinkFilters()
  const {
    links, totalCount, unreadCount, hasMore, loading, loadingMore, loadMore, refresh, refreshing,
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
    handleBulkStatusChange,
    handleBulkDelete,
    handleBulkCategoryChange,
    handleBulkAddTags,
  } = useLinks(filters.filterParams)
  const { addToast } = useToast()
  const selection = useLinksSelection()
  const [selectingAllMatching, setSelectingAllMatching] = useState(false)
  const { refetchTags } = useTagsContext()
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null)
  // `refreshing` only turns true once page 1 starts loading, so a ref guards
  // the private-tag re-read that runs first against a second click.
  const refreshInFlightRef = useRef(false)

  // Opened links move to the end of the list 30 s later. Ids still waiting
  // are tracked here so a link that leaves the list drops its pending move.
  const pendingMoveIdsRef = useRef(new Set<string>())
  const moveOpened = useMoveOpenedToEnd({
    onMove: id => {
      pendingMoveIdsRef.current.delete(id)
      handleMoveToEnd(id)
    },
    pausedAll: modals.editingLink !== null || selection.isSelectionMode,
    pausedId: modals.activeLink?.id ?? null,
  })
  const { cancel: cancelMove, cancelAll: cancelAllMoves } = moveOpened

  function cancelPendingMoves() {
    pendingMoveIdsRef.current.clear()
    cancelAllMoves()
    clearLastMove()
  }

  // A filter/search/sort change rebuilds the list, so pending moves and the
  // undo slot are dropped.
  const filterKey = JSON.stringify(filters.filterParams)
  useEffect(() => {
    pendingMoveIdsRef.current.clear()
    cancelAllMoves()
    clearLastMove()
  }, [filterKey, cancelAllMoves, clearLastMove])

  const lastMovedId = lastMove?.id ?? null
  useEffect(() => {
    const loadedIds = new Set(links.map(l => l.id))
    for (const id of pendingMoveIdsRef.current) {
      if (!loadedIds.has(id)) {
        pendingMoveIdsRef.current.delete(id)
        cancelMove(id)
      }
    }
    if (lastMovedId !== null && !loadedIds.has(lastMovedId)) clearLastMove()
  }, [links, cancelMove, lastMovedId, clearLastMove])

  const lastMovedLink = lastMovedId === null ? null : links.find(l => l.id === lastMovedId) ?? null

  // Undoing also drops a pending re-move, so the card doesn't jump away again.
  function handleUndoMove() {
    if (!lastMove) return
    pendingMoveIdsRef.current.delete(lastMove.id)
    cancelMove(lastMove.id)
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
    setLastOpenedId(id)
    if (currentStatus === 'unread') changeStatus(id, 'watching')
    pendingMoveIdsRef.current.add(id)
    moveOpened.schedule(id)
  }

  function handleFavoriteToggle(id: string) {
    toggleFavorite(id)
    modals.setActiveLink(prev => prev?.id === id ? { ...prev, is_favorite: !prev.is_favorite } : prev)
  }

  function handleBulkArchive() {
    const ids = [...selection.selectedIds]
    selection.exitSelectionMode()
    handleBulkStatusChange(ids, 'archived')
  }

  function handleBulkDeleteSelected() {
    const ids = [...selection.selectedIds]
    selection.exitSelectionMode()
    handleBulkDelete(ids)
  }

  function handleBulkRecategorize(categoryId: string | null) {
    const ids = [...selection.selectedIds]
    selection.exitSelectionMode()
    handleBulkCategoryChange(ids, categoryId)
  }

  function handleBulkTagSelected(tagNames: string[]) {
    const ids = [...selection.selectedIds]
    selection.exitSelectionMode()
    handleBulkAddTags(ids, tagNames)
  }

  async function handleSelectAllMatching() {
    setSelectingAllMatching(true)
    const { ids, totalCount: matchingCount } = await getMatchingLinkIds(filters.filterParams)
    selection.selectAll(ids)
    setSelectingAllMatching(false)
    if (matchingCount > SELECT_ALL_MATCHING_CAP) {
      addToast(
        `Selected first ${SELECT_ALL_MATCHING_CAP.toLocaleString()} of ${matchingCount.toLocaleString()} matching — narrow your filter to select more.`
      )
    }
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
    ...selection,
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
    selectingAllMatching,
    handleStatusChange,
    handleLinkOpen,
    lastOpenedId,
    lastMovedLink,
    undoingMove,
    handleUndoMove,
    handleEdit,
    handleDeleteById,
    handleFavoriteToggle,
    handleCreate,
    handleBulkArchive,
    handleBulkDeleteSelected,
    handleBulkRecategorize,
    handleBulkTagSelected,
    handleSelectAllMatching,
    addToast,
  }
}
