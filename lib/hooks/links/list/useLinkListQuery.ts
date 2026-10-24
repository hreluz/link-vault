'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getLinksPage, getMatchingLinkIds, getLinksByIds, type LinkWithTags, type LinkFilterParams } from '@/lib/services/links'
import { getPrivateTagIds, isTagVisible } from '@/lib/services/tags/tags'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { usePaginatedQuery } from '@/lib/hooks/shared/usePaginatedQuery'

const PAGE_SIZE = 40

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
    async (params: LinkFilterParams, limit: number, offset: number) => {
      if (!dek) return { items: [], totalCount: 0 }

      if (!isContentFiltered(params)) {
        const shiftedOffset = Math.max(0, offset + serverOffsetShiftRef.current)
        const { links: items, totalCount } = await getLinksPage(params, limit, shiftedOffset, dek)
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
      filtered = movedLinksLast(filtered)

      return { items: filtered.slice(offset, offset + limit), totalCount: filtered.length }
    },
    [dek, tagNameById],
  )

  const {
    items: rawLinks, setItems: setRawLinks,
    totalCount, hasMore, loading, loadingMore, loadMore,
    refresh: refreshPage, refreshing,
  } = usePaginatedQuery(filterParams, fetchPage, PAGE_SIZE)

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
    links, rawLinks, setRawLinks, totalCount, hasMore, loading, loadingMore, loadMore, refresh, refreshing,
    shiftServerOffset,
  }
}
