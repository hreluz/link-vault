'use client'

import { useState, useEffect } from 'react'
import { getLinks, toggleLinkFavorite, deleteLink, type LinkWithTags } from '@/lib/services/links'
import { getPrivateTagNames } from '@/lib/services/tags'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '@/app/dashboard/config'
import { useToast } from '@/components/ToastProvider'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'

export function useLinks() {
  const [allLinks, setAllLinks] = useState<LinkWithTags[]>([])
  const [privateTagNames, setPrivateTagNames] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const { addToast, dismissToast } = useToast()
  const { unlockedTagNames } = useUnlockedTags()

  useEffect(() => {
    Promise.all([getLinks(), getPrivateTagNames()]).then(([data, privateNames]) => {
      setAllLinks(data)
      setPrivateTagNames(new Set(privateNames))
      setLoading(false)
    })
  }, [])

  const links = allLinks.filter(link =>
    link.tags.every(tag => !privateTagNames.has(tag) || unlockedTagNames.has(tag))
  )

  function handleStatusChange(id: string, status: LinkStatus) {
    setAllLinks(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    addToast(`Moved to ${STATUS_CONFIG[status].label}`)
  }

  function handleEdit(updated: LinkWithTags) {
    setAllLinks(prev => prev.map(l => l.id === updated.id ? updated : l))
    addToast('Changes saved')
  }

  function handleDelete(id: string) {
    const snapshot = allLinks.find(l => l.id === id)
    setAllLinks(prev => prev.filter(l => l.id !== id))

    let cancelled = false
    let toastId: string

    const undo = () => {
      cancelled = true
      if (snapshot) setAllLinks(prev => [snapshot, ...prev])
      dismissToast(toastId)
    }

    toastId = addToast('Link deleted, tap to undo', 'destructive', { duration: 3000, onClick: undo })

    setTimeout(async () => {
      if (cancelled) return
      const ok = await deleteLink(id)
      if (!ok) {
        if (snapshot) setAllLinks(prev => [snapshot, ...prev])
        addToast('Failed to delete link', 'destructive')
      }
    }, 2000)
  }

  async function handleFavoriteToggle(id: string) {
    const isFav = allLinks.find(l => l.id === id)?.is_favorite
    setAllLinks(prev => prev.map(l => l.id === id ? { ...l, is_favorite: !l.is_favorite } : l))
    const ok = await toggleLinkFavorite(id, !isFav)
    if (!ok) {
      setAllLinks(prev => prev.map(l => l.id === id ? { ...l, is_favorite: !!isFav } : l))
      addToast('Failed to update favorite', 'destructive')
    } else {
      addToast(isFav ? 'Removed from favorites' : 'Added to favorites')
    }
  }

  function handleCreate(link: LinkWithTags) {
    setAllLinks(prev => [link, ...prev])
  }

  return { links, loading, handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle, handleCreate }
}
