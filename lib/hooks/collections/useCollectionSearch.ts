'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useTagNameLookup } from '@/lib/hooks/tags/useTagNameLookup'
import { matchesParsedQuery, parseHashtagQuery } from '@/lib/hooks/links/list/linkFilterMatch'
import type { CollectionLinkRow } from './useCollectionLinks'

/** A row shown under the current search, with its 1-based place in the full visible list. */
export type ShownCollectionRow = CollectionLinkRow & { number: number }

/**
 * The collection page's search box (SPEC 41): the dashboard's own rule (`#tag`
 * with `any` matching, plus free text) over the visible rows, on every keystroke.
 * Rows keep their numbers in the full list. The filter is derived, so edits and
 * private-tag locks re-filter at once. The query is cleared when the collection
 * has no visible rows left, so nothing comes back hidden behind a stale filter.
 */
export function useCollectionSearch(visibleRows: CollectionLinkRow[]) {
  const { tags } = useTagsContext()
  const tagNameById = useTagNameLookup()
  const [query, setQuery] = useState('')

  // Adjusting state during render (not in an effect) so the stale query never paints.
  if (visibleRows.length === 0 && query !== '') setQuery('')

  const trimmed = query.trim()
  const isSearching = trimmed !== ''

  const shownRows: ShownCollectionRow[] = useMemo(() => {
    const numbered = visibleRows.map((row, i) => ({ ...row, number: i + 1 }))
    if (!trimmed) return numbered
    const parsed = parseHashtagQuery(trimmed, tags)
    return numbered.filter(row => matchesParsedQuery(row.link, parsed, tagNameById))
  }, [visibleRows, trimmed, tags, tagNameById])

  const clearSearch = useCallback(() => setQuery(''), [])

  return { query, setQuery, shownRows, isSearching, isHashTagSearch: /#(\w+)/.test(query), clearSearch }
}
