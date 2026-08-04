'use client'

import { useMemo, useState } from 'react'
import type { LinkStatus } from '@/lib/types/database'
import type { LinkFilterParams } from '@/lib/services/links'
import type { SortBy } from '@/app/dashboard/link/FilterSheet'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { useTagsContext } from '@/lib/context/TagsContext'

type Filter = string | 'all'

const SEARCH_DEBOUNCE_MS = 350

export function useLinkFilters() {
  const [category, setCategory] = useState<Filter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagMode, setTagMode] = useState<'any' | 'all'>('any')
  const [selectedStatuses, setSelectedStatuses] = useState<LinkStatus[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const { unlockedTagIds } = useUnlockedTags()
  const { tags } = useTagsContext()

  const debouncedSearch = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS)

  function resetFilters() {
    setCategory('all')
    setSelectedStatuses([])
    setSelectedTagIds([])
    setTagMode('any')
    setSortBy('newest')
    setSearchQuery('')
  }

  const filterParams: LinkFilterParams = useMemo(() => {
    const trimmed = debouncedSearch.trim()
    // `#tag` tokens in the search box resolve to tag ids (via the already-
    // decrypted tag cache) and fold into the structural tag filter -- the
    // server never needs to match against a tag name. A `#tag` token that
    // doesn't match any known tag is left in place as plain text instead of
    // being dropped, so it still narrows results (via client-side text
    // match) rather than silently clearing the filter. Whatever plain text
    // remains is evaluated client-side after decryption (see ENCRYPTION.md).
    const hashtagIds: string[] = []
    const textSearch = trimmed
      .replace(/#(\w+)/g, (match, name: string) => {
        const tag = tags.find(t => t.name.toLowerCase() === name.toLowerCase())
        if (!tag) return match
        hashtagIds.push(tag.id)
        return ''
      })
      .trim()

    return {
      textSearch,
      categoryId: category === 'all' ? null : category,
      statuses: selectedStatuses,
      tagIds: Array.from(new Set([...selectedTagIds, ...hashtagIds])),
      tagMode,
      favoritesOnly,
      sortBy,
      unlockedTagIds: Array.from(unlockedTagIds),
    }
  }, [debouncedSearch, category, selectedStatuses, selectedTagIds, tagMode, favoritesOnly, sortBy, unlockedTagIds, tags])

  const query = searchQuery.trim()
  const isHashTagSearch = /#(\w+)/.test(query)
  const activeFilterCount = (sortBy !== 'newest' ? 1 : 0) + (category !== 'all' ? 1 : 0) + selectedTagIds.length
  const hasActiveFilters = activeFilterCount > 0 || selectedStatuses.length > 0 || query.length > 0

  return {
    category, setCategory,
    searchQuery, setSearchQuery,
    selectedTagIds, setSelectedTagIds,
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
