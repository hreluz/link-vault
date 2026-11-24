'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getLinksByIds, getMatchingLinkIds, type LinkWithTags } from '@/lib/services/links'
import { getPrivateTagIdSet, type CollectionMembership } from '@/lib/services/collections'
import { isTagVisible } from '@/lib/services/tags/tags'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { useDebouncedValue } from '@/lib/hooks/shared/useDebouncedValue'
import { matchesTextSearch, parseHashtagQuery } from '@/lib/hooks/links/list/linkFilterMatch'

export const ADD_LINKS_RESULT_LIMIT = 50
const SEARCH_DEBOUNCE_MS = 350

type Params = {
  isOpen: boolean
  dek: CryptoKey | null
  /** Links already in the collection: shown ticked, disabled, "Already in". */
  existingIds: Set<string>
  /** Appends the links in the given order; null on failure. */
  onAdd: (links: LinkWithTags[]) => Promise<CollectionMembership[] | null>
}

/**
 * "+ Add links" on the collection page: candidates loaded once per open (the
 * dashboard's structural query with no filters, then decrypted), searched
 * client-side with the dashboard's own text and `#tag` rules, type first.
 * The sheet is mounted per open, so the query and ticks start fresh each time.
 */
export function useAddLinksToCollection({ isOpen, dek, existingIds, onAdd }: Params) {
  const { tags } = useTagsContext()
  const { unlockedTagIds } = useUnlockedTags()
  const tagNameById = useTagNameLookup()
  const [candidates, setCandidates] = useState<LinkWithTags[]>([])
  const [privateTagIds, setPrivateTagIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [tickedIds, setTickedIds] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)

  // Read when the sheet opens; unlocking mid-sheet doesn't refetch.
  const unlockedRef = useRef(unlockedTagIds)
  useEffect(() => { unlockedRef.current = unlockedTagIds })

  useEffect(() => {
    if (!isOpen || !dek) return
    let cancelled = false
    Promise.all([
      getMatchingLinkIds({
        textSearch: '', categoryId: null, statuses: [], tagIds: [], tagMode: 'any',
        favoritesOnly: false, sortBy: 'newest', unlockedTagIds: Array.from(unlockedRef.current),
      }),
      getPrivateTagIdSet(),
    ])
      .then(async ([{ ids }, privateIds]) => {
        const links = await getLinksByIds(ids, dek)
        if (cancelled) return
        setCandidates(links)
        setPrivateTagIds(privateIds)
        setLoadError(false)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [isOpen, dek, attempt])

  const retry = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    setAttempt(n => n + 1)
  }, [])

  const trimmedQuery = debouncedQuery.trim()

  const { results, totalMatches } = useMemo(() => {
    if (!trimmedQuery) return { results: [] as LinkWithTags[], totalMatches: 0 }
    const { textSearch, tagIds } = parseHashtagQuery(trimmedQuery, tags)
    const matches = candidates
      .filter(link => link.deleted_at === null)
      // Second check on top of the RPC: no link with a locked private tag.
      .filter(link => link.tags.every(id => isTagVisible(privateTagIds.has(id), id, unlockedTagIds)))
      .filter(link => tagIds.length === 0 || link.tags.some(id => tagIds.includes(id)))
      .filter(link => matchesTextSearch(link, textSearch, tagNameById))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    return { results: matches.slice(0, ADD_LINKS_RESULT_LIMIT), totalMatches: matches.length }
  }, [trimmedQuery, tags, candidates, privateTagIds, unlockedTagIds, tagNameById])

  function toggleTick(linkId: string) {
    if (existingIds.has(linkId)) return
    setTickedIds(prev => prev.includes(linkId) ? prev.filter(id => id !== linkId) : [...prev, linkId])
  }

  /** Appends the ticked links in tick order. Returns the added links, or null on failure (ticks kept). */
  async function submit(): Promise<LinkWithTags[] | null> {
    if (tickedIds.length === 0 || adding) return null
    const byId = new Map(candidates.map(link => [link.id, link]))
    const links = tickedIds.flatMap(id => byId.get(id) ? [byId.get(id)!] : [])
    setAdding(true)
    const inserted = await onAdd(links)
    setAdding(false)
    return inserted ? links : null
  }

  return {
    loading, loadError, retry,
    query, setQuery, hasQuery: trimmedQuery !== '', searchedQuery: trimmedQuery,
    results, totalMatches, tickedIds, toggleTick, submit, adding,
  }
}
