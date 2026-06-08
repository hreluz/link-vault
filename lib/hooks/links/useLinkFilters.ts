'use client'

import { useState } from 'react'
import type { LinkWithTags } from '@/lib/services/links'
import type { LinkStatus } from '@/lib/types/database'
import type { SortBy } from '@/app/dashboard/link/FilterSheet'

type Filter = string | 'all'

const STATUS_ORDER: Record<LinkStatus, number> = {
  unread: 0, watching: 1, read: 2, archived: 3,
}

export function useLinkFilters(links: LinkWithTags[]) {
  const [category, setCategory] = useState<Filter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagMode, setTagMode] = useState<'any' | 'all'>('any')
  const [selectedStatuses, setSelectedStatuses] = useState<LinkStatus[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('newest')

  function resetFilters() {
    setCategory('all')
    setSelectedStatuses([])
    setSelectedTags([])
    setTagMode('any')
    setSortBy('newest')
    setSearchQuery('')
  }

  const byCategory = category === 'all' ? links : links.filter(l => l.category_id === category)

  const query = searchQuery.trim().toLowerCase()
  const hashTagTerms = query.match(/#(\w+)/g)?.map(t => t.slice(1)) ?? []
  const plainQuery = query.replace(/#\w+/g, '').trim()
  const isHashTagSearch = hashTagTerms.length > 0

  const bySearch = query
    ? byCategory.filter(l => {
        const tagMatch = isHashTagSearch
          ? hashTagTerms.every(ht => l.tags.some(t => t.toLowerCase().includes(ht)))
          : false
        const textMatch = plainQuery
          ? (l.title ?? '').toLowerCase().includes(plainQuery) ||
            (l.site_name ?? '').toLowerCase().includes(plainQuery) ||
            l.tags.some(t => t.toLowerCase().includes(plainQuery))
          : false
        if (isHashTagSearch && plainQuery) return tagMatch && textMatch
        if (isHashTagSearch) return tagMatch
        return textMatch
      })
    : byCategory

  const byStatus = selectedStatuses.length > 0
    ? bySearch.filter(l => selectedStatuses.includes(l.status))
    : bySearch

  const byTags = selectedTags.length > 0
    ? byStatus.filter(l =>
        tagMode === 'all'
          ? selectedTags.every(tag => l.tags.includes(tag))
          : selectedTags.some(tag => l.tags.includes(tag))
      )
    : byStatus

  const results = [...byTags].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':       return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'alphabetical': return (a.title ?? '').localeCompare(b.title ?? '')
      case 'status':       return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      default:             return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const activeFilterCount = (sortBy !== 'newest' ? 1 : 0) + (category !== 'all' ? 1 : 0) + selectedStatuses.length + selectedTags.length
  const hasActiveFilters = activeFilterCount > 0 || query.length > 0
  const allTags = Array.from(new Set(links.flatMap(l => l.tags))).sort()

  return {
    category, setCategory,
    searchQuery, setSearchQuery,
    selectedTags, setSelectedTags,
    tagMode, setTagMode,
    selectedStatuses, setSelectedStatuses,
    sortBy, setSortBy,
    results,
    allTags,
    isHashTagSearch,
    activeFilterCount,
    hasActiveFilters,
    resetFilters,
  }
}
