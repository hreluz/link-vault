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

  return { handleBulkStatusChange, handleBulkDelete, handleBulkCategoryChange, handleBulkAddTags }
}
