'use client'

import { useState } from 'react'
import { useToast } from '@/components/ToastProvider'
import { useLinkModals } from './useLinkModals'
import { useLinks } from './useLinks'
import { useLinkFilters } from './useLinkFilters'
import { useLinksSelection } from './useLinksSelection'
import { getMatchingLinkIds, SELECT_ALL_MATCHING_CAP, type LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'

export function useLinkList() {
  const modals = useLinkModals()
  const filters = useLinkFilters()
  const {
    links, totalCount, hasMore, loading, loadingMore, loadMore,
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

  return {
    ...modals,
    ...filters,
    ...selection,
    links,
    totalCount,
    hasMore,
    loading,
    loadingMore,
    loadMore,
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
