'use client'

import { useState, useEffect } from 'react'
import { getFavorites } from '@/lib/services/favorites'
import { toggleLinkFavorite, type LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '@/app/dashboard/config'
import { useToast } from '@/components/ToastProvider'

export function useFavorites() {
  const [links, setLinks] = useState<LinkWithTags[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    getFavorites().then(data => {
      setLinks(data)
      setLoading(false)
    })
  }, [])

  function handleStatusChange(id: string, status: LinkStatus) {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    addToast(`Moved to ${STATUS_CONFIG[status].label}`)
  }

  function handleEdit(updated: LinkWithTags) {
    setLinks(prev => prev.map(l => l.id === updated.id ? updated : l))
    addToast('Changes saved')
  }

  function handleDelete(id: string) {
    setLinks(prev => prev.filter(l => l.id !== id))
    addToast('Link deleted', 'destructive')
  }

  async function handleFavoriteToggle(id: string) {
    const link = links.find(l => l.id === id)
    if (!link) return
    setLinks(prev => prev.filter(l => l.id !== id))
    const ok = await toggleLinkFavorite(id, false)
    if (!ok) {
      setLinks(prev => [link, ...prev])
      addToast('Failed to remove from favorites', 'destructive')
    } else {
      addToast('Removed from favorites')
    }
  }

  return { links, loading, handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle }
}
