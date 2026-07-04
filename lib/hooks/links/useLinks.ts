'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getLinksPage, toggleLinkFavorite, deleteLink,
  bulkUpdateStatus, bulkSoftDelete, bulkUpdateCategory, bulkAddTags,
  type LinkWithTags, type LinkFilterParams,
} from '@/lib/services/links'
import { getPrivateTagNames, isTagVisible } from '@/lib/services/tags'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '@/app/dashboard/config'
import { useToast } from '@/components/ToastProvider'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'

const PAGE_SIZE = 40

function matchesLocalFilters(link: LinkWithTags, params: LinkFilterParams): boolean {
  if (params.statuses.length > 0 && !params.statuses.includes(link.status)) return false
  if (params.favoritesOnly && !link.is_favorite) return false
  if (params.categoryId && link.category_id !== params.categoryId) return false
  return true
}

export function useLinks(filterParams: LinkFilterParams) {
  const { addToast, dismissToast } = useToast()
  const { refetchTags } = useTagsContext()
  const { unlockedTagNames } = useUnlockedTags()
  const [privateTagNames, setPrivateTagNames] = useState<Set<string>>(new Set())

  useEffect(() => {
    getPrivateTagNames().then(names => setPrivateTagNames(new Set(names)))
  }, [])

  const fetchPage = useCallback(
    async (params: LinkFilterParams, limit: number, offset: number) => {
      const { links: items, totalCount } = await getLinksPage(params, limit, offset)
      return { items, totalCount }
    },
    [],
  )

  const {
    items: rawLinks, setItems: setRawLinks,
    totalCount, hasMore, loading, loadingMore, loadMore,
  } = usePaginatedQuery(filterParams, fetchPage, PAGE_SIZE)

  // Defense-in-depth: the server already excludes locked private tags from
  // every query, but re-check on the (small) loaded page too, given the
  // password/nuke security posture around private tags.
  const links = rawLinks.filter(link =>
    link.tags.every(tag => isTagVisible(privateTagNames.has(tag), tag, unlockedTagNames))
  )

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

  async function handleBulkStatusChange(ids: string[], status: LinkStatus) {
    const snapshots = rawLinks.filter(l => ids.includes(l.id))
    setRawLinks(prev => prev.map(l => ids.includes(l.id) ? { ...l, status } : l))
    pruneIfMismatched(ids)
    const ok = await bulkUpdateStatus(ids, status)
    if (!ok) {
      setRawLinks(prev => prev.map(l => {
        const snap = snapshots.find(s => s.id === l.id)
        return snap ? { ...l, status: snap.status } : l
      }))
      addToast('Failed to update links', 'destructive')
    }
  }

  async function handleBulkDelete(ids: string[]) {
    const snapshots = rawLinks.filter(l => ids.includes(l.id))
    setRawLinks(prev => prev.filter(l => !ids.includes(l.id)))
    const ok = await bulkSoftDelete(ids)
    if (!ok) {
      setRawLinks(prev => [...snapshots, ...prev])
      addToast('Failed to delete links', 'destructive')
    } else {
      addToast(`${ids.length} link${ids.length !== 1 ? 's' : ''} deleted`)
    }
  }

  async function handleBulkCategoryChange(ids: string[], categoryId: string | null) {
    const snapshots = rawLinks.filter(l => ids.includes(l.id))
    setRawLinks(prev => prev.map(l => ids.includes(l.id) ? { ...l, category_id: categoryId } : l))
    pruneIfMismatched(ids)
    const ok = await bulkUpdateCategory(ids, categoryId)
    if (!ok) {
      setRawLinks(prev => prev.map(l => {
        const snap = snapshots.find(s => s.id === l.id)
        return snap ? { ...l, category_id: snap.category_id } : l
      }))
      addToast('Failed to update category', 'destructive')
    }
  }

  async function handleBulkAddTags(ids: string[], tagNames: string[]) {
    const snapshots = rawLinks.filter(l => ids.includes(l.id))
    setRawLinks(prev => prev.map(l =>
      ids.includes(l.id)
        ? { ...l, tags: Array.from(new Set([...l.tags, ...tagNames])) }
        : l
    ))
    const ok = await bulkAddTags(ids, tagNames)
    if (!ok) {
      setRawLinks(prev => prev.map(l => {
        const snap = snapshots.find(s => s.id === l.id)
        return snap ? { ...l, tags: snap.tags } : l
      }))
      addToast('Failed to add tags', 'destructive')
    } else {
      refetchTags()
    }
  }

  return {
    links, totalCount, hasMore, loading, loadingMore, loadMore,
    handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle, handleCreate,
    handleBulkStatusChange, handleBulkDelete, handleBulkCategoryChange, handleBulkAddTags,
  }
}
