'use client'

import { useMemo, useState } from 'react'
import type { LinkStatus } from '@/lib/types/database'
import type { LinkFilterParams } from '@/lib/services/links'
import type { SortBy } from '@/app/dashboard/link/FilterSheet'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'

type Filter = string | 'all'

const SEARCH_DEBOUNCE_MS = 350

export function useLinkFilters() {
  const [category, setCategory] = useState<Filter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagMode, setTagMode] = useState<'any' | 'all'>('any')
  const [selectedStatuses, setSelectedStatuses] = useState<LinkStatus[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const { unlockedTagNames } = useUnlockedTags()

  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS)

  function resetFilters() {
    setCategory('all')
    setSelectedStatuses([])
    setSelectedTags([])
    setTagMode('any')
    setSortBy('newest')
    setSearchQuery('')
  }

  const filterParams: LinkFilterParams = useMemo(() => ({
    search: debouncedSearch.trim(),
    categoryId: category === 'all' ? null : category,
    statuses: selectedStatuses,
    tagNames: selectedTags,
    tagMode,
    favoritesOnly,
    sortBy,
    unlockedTagNames: Array.from(unlockedTagNames),
  }), [debouncedSearch, category, selectedStatuses, selectedTags, tagMode, favoritesOnly, sortBy, unlockedTagNames])

  const query = searchQuery.trim()
  const isHashTagSearch = /#(\w+)/.test(query)
  const activeFilterCount = (sortBy !== 'newest' ? 1 : 0) + (category !== 'all' ? 1 : 0) + selectedTags.length
  const hasActiveFilters = activeFilterCount > 0 || selectedStatuses.length > 0 || query.length > 0

  return {
    category, setCategory,
    searchQuery, setSearchQuery,
    selectedTags, setSelectedTags,
    tagMode, setTagMode,
    selectedStatuses, setSelectedStatuses,
    sortBy, setSortBy,
    favoritesOnly, setFavoritesOnly,
    filterParams,
    isHashTagSearch,
    activeFilterCount,
    hasActiveFilters,
    resetFilters,
  }
}
