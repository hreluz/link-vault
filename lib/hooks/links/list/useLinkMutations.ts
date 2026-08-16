'use client'

import type { Dispatch, SetStateAction } from 'react'
import { toggleLinkFavorite, deleteLink, type LinkWithTags, type LinkFilterParams } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '@/app/dashboard/config'
import { useToast } from '@/components/ToastProvider'
import { useTagsContext } from '@/lib/context/TagsContext'
import { matchesLocalFilters } from './linkFilterMatch'

export function useLinkMutations(
  rawLinks: LinkWithTags[],
  setRawLinks: Dispatch<SetStateAction<LinkWithTags[]>>,
  filterParams: LinkFilterParams,
) {
  const { addToast, dismissToast } = useToast()
  const { refetchTags } = useTagsContext()

  function pruneIfMismatched(ids: string[]) {
    setRawLinks(prev => prev.filter(l => !ids.includes(l.id) || matchesLocalFilters(l, filterParams)))
  }

  function handleStatusChange(id: string, status: LinkStatus) {
    setRawLinks(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    pruneIfMismatched([id])
    addToast(`Moved to ${STATUS_CONFIG[status].label}`)
  }

  function handleEdit(updated: LinkWithTags) {
    setRawLinks(prev => prev.map(l => l.id === updated.id ? updated : l))
    pruneIfMismatched([updated.id])
    addToast('Changes saved')
    refetchTags()
  }

  function handleDelete(id: string) {
    const snapshot = rawLinks.find(l => l.id === id)
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
      const ok = await deleteLink(id)
      if (!ok) {
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

  function handleCreate(link: LinkWithTags) {
    setRawLinks(prev => matchesLocalFilters(link, filterParams) ? [link, ...prev] : prev)
    refetchTags()
  }

  return { handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle, handleCreate }
}
