'use client'

import type { Dispatch, SetStateAction } from 'react'
import {
  bulkUpdateStatus, bulkSoftDelete, bulkUpdateCategory, bulkAddTags,
  type LinkWithTags, type LinkFilterParams,
} from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'
import { useToast } from '@/components/ToastProvider'
import { useTagsContext } from '@/lib/context/TagsContext'
import { matchesLocalFilters } from './linkFilterMatch'

export function useLinkBulkMutations(
  rawLinks: LinkWithTags[],
  setRawLinks: Dispatch<SetStateAction<LinkWithTags[]>>,
  filterParams: LinkFilterParams,
  dek: CryptoKey | null,
) {
  const { addToast } = useToast()
  const { refetchTags } = useTagsContext()

  function pruneIfMismatched(ids: string[]) {
    setRawLinks(prev => prev.filter(l => !ids.includes(l.id) || matchesLocalFilters(l, filterParams)))
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
    const deletableIds = ids.filter(id => !snapshots.find(s => s.id === id)?.is_favorite)
    setRawLinks(prev => prev.filter(l => !deletableIds.includes(l.id)))
    const result = await bulkSoftDelete(ids)
    if (!result) {
      setRawLinks(prev => [...snapshots, ...prev])
      addToast('Failed to delete links', 'destructive')
      return
    }
    const { deletedIds } = result
    // Reconcile against the server's authoritative result: drop anything actually
    // deleted that a race left behind, restore anything optimistically removed
    // that turned out to be favorited/undeletable.
    setRawLinks(prev => {
      const withoutDeleted = prev.filter(l => !deletedIds.includes(l.id))
      const missingSnapshots = snapshots.filter(
        s => !deletedIds.includes(s.id) && !withoutDeleted.find(l => l.id === s.id)
      )
      return [...missingSnapshots, ...withoutDeleted]
    })
    const skipped = ids.length - deletedIds.length
    if (skipped > 0) {
      addToast(`${deletedIds.length} link${deletedIds.length !== 1 ? 's' : ''} deleted, ${skipped} favorited link${skipped !== 1 ? 's' : ''} skipped`)
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

  return { handleBulkStatusChange, handleBulkDelete, handleBulkCategoryChange, handleBulkAddTags }
}
