'use client'

import { useToast } from '@/components/ToastProvider'
import { useLinkModals } from './useLinkModals'
import { useLinks } from './useLinks'
import { useLinkFilters } from './useLinkFilters'
import { useLinksSelection } from './useLinksSelection'
import type { LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'

export function useLinkList() {
  const modals = useLinkModals()
  const {
    links, loading,
    handleStatusChange: changeStatus,
    handleEdit: editLink,
    handleDelete: deleteLink,
    handleFavoriteToggle: toggleFavorite,
    handleCreate,
    handleBulkStatusChange,
    handleBulkDelete,
    handleBulkCategoryChange,
    handleBulkAddTags,
  } = useLinks()
  const filters = useLinkFilters(links)
  const { addToast } = useToast()
  const selection = useLinksSelection()

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

  return {
    ...modals,
    ...filters,
    ...selection,
    links,
    loading,
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
    addToast,
  }
}
