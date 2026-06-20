'use client'

import { useState, useEffect } from 'react'
import {
  getLinks, toggleLinkFavorite, deleteLink,
  bulkUpdateStatus, bulkSoftDelete, bulkUpdateCategory, bulkAddTags,
  type LinkWithTags,
} from '@/lib/services/links'
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

  async function handleBulkStatusChange(ids: string[], status: LinkStatus) {
    const snapshots = allLinks.filter(l => ids.includes(l.id))
    setAllLinks(prev => prev.map(l => ids.includes(l.id) ? { ...l, status } : l))
    const ok = await bulkUpdateStatus(ids, status)
    if (!ok) {
      setAllLinks(prev => prev.map(l => {
        const snap = snapshots.find(s => s.id === l.id)
        return snap ? { ...l, status: snap.status } : l
      }))
      addToast('Failed to update links', 'destructive')
    }
  }

  async function handleBulkDelete(ids: string[]) {
    const snapshots = allLinks.filter(l => ids.includes(l.id))
    setAllLinks(prev => prev.filter(l => !ids.includes(l.id)))
    const ok = await bulkSoftDelete(ids)
    if (!ok) {
      setAllLinks(prev => [...snapshots, ...prev])
      addToast('Failed to delete links', 'destructive')
    } else {
      addToast(`${ids.length} link${ids.length !== 1 ? 's' : ''} deleted`)
    }
  }

  async function handleBulkCategoryChange(ids: string[], categoryId: string | null) {
    const snapshots = allLinks.filter(l => ids.includes(l.id))
    setAllLinks(prev => prev.map(l => ids.includes(l.id) ? { ...l, category_id: categoryId } : l))
    const ok = await bulkUpdateCategory(ids, categoryId)
    if (!ok) {
      setAllLinks(prev => prev.map(l => {
        const snap = snapshots.find(s => s.id === l.id)
        return snap ? { ...l, category_id: snap.category_id } : l
      }))
      addToast('Failed to update category', 'destructive')
    }
  }

  async function handleBulkAddTags(ids: string[], tagNames: string[]) {
    const snapshots = allLinks.filter(l => ids.includes(l.id))
    setAllLinks(prev => prev.map(l =>
      ids.includes(l.id)
        ? { ...l, tags: Array.from(new Set([...l.tags, ...tagNames])) }
        : l
    ))
    const ok = await bulkAddTags(ids, tagNames)
    if (!ok) {
      setAllLinks(prev => prev.map(l => {
        const snap = snapshots.find(s => s.id === l.id)
        return snap ? { ...l, tags: snap.tags } : l
      }))
      addToast('Failed to add tags', 'destructive')
    }
  }

  return {
    links, loading,
    handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle, handleCreate,
    handleBulkStatusChange, handleBulkDelete, handleBulkCategoryChange, handleBulkAddTags,
  }
}
