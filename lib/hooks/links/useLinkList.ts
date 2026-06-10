'use client'

import { useToast } from '@/components/ToastProvider'
import { useLinkModals } from './useLinkModals'
import { useLinks } from './useLinks'
import { useLinkFilters } from './useLinkFilters'
import type { LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'

export function useLinkList() {
  const modals = useLinkModals()
  const { links, loading, handleStatusChange: changeStatus, handleEdit: editLink, handleDelete: deleteLink, handleFavoriteToggle: toggleFavorite, handleCreate } = useLinks()
  const filters = useLinkFilters(links)
  const { addToast } = useToast()

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

  function handleLinkOpen(id: string, currentStatus: LinkStatus) {
    if (currentStatus === 'unread') changeStatus(id, 'watching')
  }

  function handleFavoriteToggle(id: string) {
    toggleFavorite(id)
    modals.setActiveLink(prev => prev?.id === id ? { ...prev, is_favorite: !prev.is_favorite } : prev)
  }

  return {
    ...modals,
    ...filters,
    links,
    loading,
    handleStatusChange,
    handleLinkOpen,
    handleEdit,
    handleDelete,
    handleFavoriteToggle,
    handleCreate,
    addToast,
  }
}
