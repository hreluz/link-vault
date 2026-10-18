'use client'

import { useRef, useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useLinkModals } from './useLinkModals'
import { useLinks } from './useLinks'
import { useLinkFilters } from './useLinkFilters'
import { useLinksSelection } from './useLinksSelection'
import { getMatchingLinkIds, SELECT_ALL_MATCHING_CAP, type LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'

export function useLinkList(autoFetchDefault = true) {
  const modals = useLinkModals()
  const filters = useLinkFilters()
  const {
    links, totalCount, hasMore, loading, loadingMore, loadMore, refresh, refreshing,
    handleStatusChange: changeStatus,
    handleEdit: editLink,
    handleDelete: deleteLink,
    handleFavoriteToggle: toggleFavorite,
    handleCreate,
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
  // `refreshing` only turns true once page 1 starts loading, so a ref guards
  // the private-tag re-read that runs first against a second click.
  const refreshInFlightRef = useRef(false)

  function handleStatusChange(id: string, status: LinkStatus) {
    changeStatus(id, status)
    modals.setActiveLink(prev => prev?.id === id ? { ...prev, status } : prev)
  }

  function handleEdit(updated: LinkWithTags) {
    editLink(updated)
    modals.setEditingLink(null)
  }

  function handleDelete() {
    if (!modals.activeLink) return
    deleteLink(modals.activeLink.id)
    modals.setActiveLink(null)
  }

  function handleDeleteById(id: string) {
    deleteLink(id)
  }

  function handleLinkOpen(id: string, currentStatus: LinkStatus) {
    if (currentStatus === 'unread') changeStatus(id, 'watching')
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
    handleEdit,
    handleDelete,
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
