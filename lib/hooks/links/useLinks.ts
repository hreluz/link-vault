'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getLinksPage, getMatchingLinkIds, getLinksByIds, toggleLinkFavorite, deleteLink,
  bulkUpdateStatus, bulkSoftDelete, bulkUpdateCategory, bulkAddTags,
  type LinkWithTags, type LinkFilterParams,
} from '@/lib/services/links'
import { getPrivateTagIds, isTagVisible } from '@/lib/services/tags'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '@/app/dashboard/config'
import { useToast } from '@/components/ToastProvider'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { useVault } from '@/lib/context/VaultContext'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'

const PAGE_SIZE = 40

function matchesLocalFilters(link: LinkWithTags, params: LinkFilterParams): boolean {
  if (params.statuses.length > 0 && !params.statuses.includes(link.status)) return false
  if (params.favoritesOnly && !link.is_favorite) return false
  if (params.categoryId && link.category_id !== params.categoryId) return false
  return true
}

function isContentFiltered(params: LinkFilterParams): boolean {
  return params.textSearch.length > 0 || params.sortBy === 'alphabetical'
}

/** Everything except textSearch -- used to decide whether the Branch B candidate cache is still valid. */
function structuralKey(params: LinkFilterParams): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it from the key
  const { textSearch, ...structural } = params
  return JSON.stringify(structural)
}

export function useLinks(filterParams: LinkFilterParams) {
  const { addToast, dismissToast } = useToast()
  const { refetchTags } = useTagsContext()
  const tagNameById = useTagNameLookup()
  const { unlockedTagIds } = useUnlockedTags()
  const { dek } = useVault()
  const [privateTagIds, setPrivateTagIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getPrivateTagIds().then(ids => setPrivateTagIds(new Set(ids)))
  }, [])

  // Branch B (free-text search / alphabetical sort): the decrypted candidate
  // set is cached by structural filters only, so retyping a search term
  // never re-fetches or re-decrypts -- see ENCRYPTION.md.
  const contentCacheRef = useRef<{ key: string; items: LinkWithTags[] } | null>(null)

  const fetchPage = useCallback(
    async (params: LinkFilterParams, limit: number, offset: number) => {
      if (!dek) return { items: [], totalCount: 0 }

      if (!isContentFiltered(params)) {
        const { links: items, totalCount } = await getLinksPage(params, limit, offset, dek)
        return { items, totalCount }
      }

      const key = structuralKey(params)
      let candidates: LinkWithTags[]
      if (contentCacheRef.current && contentCacheRef.current.key === key) {
        candidates = contentCacheRef.current.items
      } else {
        const { ids } = await getMatchingLinkIds(params)
        candidates = await getLinksByIds(ids, dek)
        contentCacheRef.current = { key, items: candidates }
      }

      const q = params.textSearch.toLowerCase()
      let filtered = candidates
      if (q) {
        filtered = candidates.filter(link => {
          const tagNames = link.tags.map(id => tagNameById.get(id) ?? '')
          return (
            link.title?.toLowerCase().includes(q) ||
            link.url.toLowerCase().includes(q) ||
            link.site_name?.toLowerCase().includes(q) ||
            link.notes?.toLowerCase().includes(q) ||
            tagNames.some(name => name.toLowerCase().includes(q))
          )
        })
      }

      if (params.sortBy === 'alphabetical') {
        filtered = [...filtered].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
      }

      return { items: filtered.slice(offset, offset + limit), totalCount: filtered.length }
    },
    [dek, tagNameById],
  )

  const {
    items: rawLinks, setItems: setRawLinks,
    totalCount, hasMore, loading, loadingMore, loadMore,
  } = usePaginatedQuery(filterParams, fetchPage, PAGE_SIZE)

  // Defense-in-depth: the server already excludes locked private tags from
  // every query, but re-check on the (small) loaded page too, given the
  // password/nuke security posture around private tags.
  const links = rawLinks.filter(link =>
    link.tags.every(tagId => isTagVisible(privateTagIds.has(tagId), tagId, unlockedTagIds))
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
    if (!dek) return
    const tagIds = await bulkAddTags(ids, tagNames, dek)
    if (!tagIds) {
      addToast('Failed to add tags', 'destructive')
      return
    }
    setRawLinks(prev => prev.map(l =>
      ids.includes(l.id) ? { ...l, tags: Array.from(new Set([...l.tags, ...tagIds])) } : l
    ))
    refetchTags()
  }

  return {
    links, totalCount, hasMore, loading, loadingMore, loadMore,
    handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle, handleCreate,
    handleBulkStatusChange, handleBulkDelete, handleBulkCategoryChange, handleBulkAddTags,
  }
}
