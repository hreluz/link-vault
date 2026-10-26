'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getLinksPage, getMatchingLinkIds, getLinksByIds, type LinkWithTags, type LinkFilterParams } from '@/lib/services/links'
import { getPrivateTagIds, isTagVisible } from '@/lib/services/tags/tags'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { usePaginatedQuery, type PageResult } from '@/lib/hooks/shared/usePaginatedQuery'

const PAGE_SIZE = 40

type ListMeta = { unreadCount: number }

function isContentFiltered(params: LinkFilterParams): boolean {
  return params.textSearch.length > 0 || params.sortBy === 'alphabetical'
}

/** Unmoved links first (current order kept), then moved ones by move time, oldest move first -- same rule as the search_links RPC. */
function movedLinksLast(links: LinkWithTags[]): LinkWithTags[] {
  return [...links].sort((a, b) => {
    if (a.moved_to_end_at === b.moved_to_end_at) return 0
    if (a.moved_to_end_at === null) return -1
    if (b.moved_to_end_at === null) return 1
    return Date.parse(a.moved_to_end_at) - Date.parse(b.moved_to_end_at)
  })
}

/**
 * Server counts corrected for what changed locally since the fetch: links
 * removed from the list (delete, filter prune), links added (create), and
 * status changes on loaded links. Clamped at 0.
 */
function correctedCounts(
  fetched: LinkWithTags[], current: LinkWithTags[], serverTotal: number, serverUnread: number,
): { totalCount: number; unreadCount: number } {
  const currentById = new Map(current.map(link => [link.id, link]))
  const fetchedIds = new Set(fetched.map(link => link.id))
  let totalCount = serverTotal
  let unreadCount = serverUnread
  for (const link of fetched) {
    const now = currentById.get(link.id)
    if (!now) totalCount--
    unreadCount += Number(now?.status === 'unread') - Number(link.status === 'unread')
  }
  for (const link of current) {
    if (fetchedIds.has(link.id)) continue
    totalCount++
    if (link.status === 'unread') unreadCount++
  }
  return { totalCount: Math.max(0, totalCount), unreadCount: Math.max(0, unreadCount) }
}

/** Everything except textSearch -- used to decide whether the Branch B candidate cache is still valid. */
function structuralKey(params: LinkFilterParams): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit it from the key
  const { textSearch, ...structural } = params
  return JSON.stringify(structural)
}

export function useLinkListQuery(filterParams: LinkFilterParams, dek: CryptoKey | null) {
  const tagNameById = useTagNameLookup()
  const { unlockedTagIds } = useUnlockedTags()
  const [privateTagIds, setPrivateTagIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getPrivateTagIds().then(ids => setPrivateTagIds(new Set(ids)))
  }, [])

  // Branch B (free-text search / alphabetical sort): the decrypted candidate
  // set is cached by structural filters only, so retyping a search term
  // never re-fetches or re-decrypts -- see ENCRYPTION.md.
  const contentCacheRef = useRef<{ key: string; items: LinkWithTags[] } | null>(null)

  // Each saved move-to-end pulls one already-loaded link out of the server
  // order ahead of the next page, so later Branch A offsets are corrected by
  // this much. Declared before usePaginatedQuery so the reset effect runs
  // before its page-1 fetch on a params change.
  const serverOffsetShiftRef = useRef(0)
  const paramsKey = JSON.stringify(filterParams)
  useEffect(() => { serverOffsetShiftRef.current = 0 }, [paramsKey])

  const shiftServerOffset = useCallback((delta: number) => {
    serverOffsetShiftRef.current += delta
  }, [])

  const fetchPage = useCallback(
    async (params: LinkFilterParams, limit: number, offset: number): Promise<PageResult<LinkWithTags, ListMeta>> => {
      if (!dek) return { items: [], totalCount: 0, meta: { unreadCount: 0 } }

      if (!isContentFiltered(params)) {
        const shiftedOffset = Math.max(0, offset + serverOffsetShiftRef.current)
        const { links: items, totalCount, unreadCount } = await getLinksPage(params, limit, shiftedOffset, dek)
        return { items, totalCount, meta: { unreadCount } }
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
      filtered = movedLinksLast(filtered)

      return {
        items: filtered.slice(offset, offset + limit),
        totalCount: filtered.length,
        meta: { unreadCount: filtered.filter(link => link.status === 'unread').length },
      }
    },
    [dek, tagNameById],
  )

  const {
    items: rawLinks, setItems: setRawLinks, fetchedItems,
    totalCount: serverTotalCount, meta, hasMore, loading, loadingMore, loadMore,
    refresh: refreshPage, refreshing,
  } = usePaginatedQuery(filterParams, fetchPage, PAGE_SIZE)

  // hasMore keeps using the server count, so a local delete doesn't stop pagination early.
  const { totalCount, unreadCount } = correctedCounts(fetchedItems, rawLinks, serverTotalCount, meta?.unreadCount ?? 0)

  // Drops the Branch B candidate cache so search / alphabetical sort re-fetch
  // and re-decrypt, re-reads which tags are private, then reloads page 1.
  const refresh = useCallback(async () => {
    contentCacheRef.current = null
    serverOffsetShiftRef.current = 0
    const ids = await getPrivateTagIds()
    setPrivateTagIds(new Set(ids))
    await refreshPage()
  }, [refreshPage])

  // Defense-in-depth: the server already excludes locked private tags from
  // every query, but re-check on the (small) loaded page too, given the
  // password/nuke security posture around private tags.
  const links = rawLinks.filter(link =>
    link.tags.every(tagId => isTagVisible(privateTagIds.has(tagId), tagId, unlockedTagIds))
  )

  return {
    links, rawLinks, setRawLinks, totalCount, unreadCount, hasMore, loading, loadingMore, loadMore, refresh, refreshing,
    shiftServerOffset,
  }
}
