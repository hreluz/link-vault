'use client'

import { useState, useEffect } from 'react'
import { getLinks, type LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '@/app/dashboard/config'
import { useToast } from '@/components/ToastProvider'

export function useLinks() {
  const [links, setLinks] = useState<LinkWithTags[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    getLinks().then(data => {
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

  function handleFavoriteToggle(id: string) {
    const isFav = links.find(l => l.id === id)?.is_favorite
    setLinks(prev => prev.map(l => l.id === id ? { ...l, is_favorite: !l.is_favorite } : l))
    addToast(isFav ? 'Removed from favorites' : 'Added to favorites')
  }

  function handleCreate(link: LinkWithTags) {
    setLinks(prev => [link, ...prev])
  }

  return { links, loading, handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle, handleCreate }
}
