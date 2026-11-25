'use client'

import { useCallback, useMemo, useState } from 'react'
import { filterCollectionsByText } from '@/lib/utils/collectionSearch'

/**
 * The Collections list page's search box (SPEC 41): name or description,
 * filtered on every keystroke, page state only.
 */
export function useCollectionListSearch<T extends { name: string; description: string | null }>(collections: T[]) {
  const [query, setQuery] = useState('')
  const filteredCollections = useMemo(() => filterCollectionsByText(collections, query), [collections, query])
  const clearSearch = useCallback(() => setQuery(''), [])
  return { query, setQuery, filteredCollections, isSearching: query.trim() !== '', clearSearch }
}
