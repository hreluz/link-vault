'use client'

import { useState } from 'react'
import { MOCK_LINKS, type MockLink } from '@/lib/mock-data'
import type { ContentType, LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '@/app/dashboard/config'
import { useToast } from '@/components/ToastProvider'
import type { SortBy } from '@/app/dashboard/link/FilterSheet'

type Filter = ContentType | 'all'

const STATUS_ORDER: Record<LinkStatus, number> = {
  unread: 0, watching: 1, read: 2, favorite: 3, archived: 4,
}

export function useLinkList() {
  const [links, setLinks] = useState<MockLink[]>(MOCK_LINKS)
  const [category, setCategory] = useState<Filter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagMode, setTagMode] = useState<'any' | 'all'>('any')
  const [selectedStatuses, setSelectedStatuses] = useState<LinkStatus[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [activeLink, setActiveLink] = useState<MockLink | null>(null)
  const [editingLink, setEditingLink] = useState<MockLink | null>(null)
  const { addToast } = useToast()

  function handleStatusChange(id: string, status: LinkStatus) {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    setActiveLink(prev => prev?.id === id ? { ...prev, status } : prev)
    addToast(`Moved to ${STATUS_CONFIG[status].label}`)
  }

  function handleEdit(updated: MockLink) {
    setLinks(prev => prev.map(l => l.id === updated.id ? updated : l))
    setEditingLink(null)
    addToast('Changes saved')
  }

  function handleDelete() {
    if (!activeLink) return
    setLinks(prev => prev.filter(l => l.id !== activeLink.id))
    setActiveLink(null)
    addToast('Link deleted', 'destructive')
  }

  function handleFavoriteToggle(id: string) {
    const isFav = links.find(l => l.id === id)?.is_favorite
    setLinks(prev => prev.map(l => l.id === id ? { ...l, is_favorite: !l.is_favorite } : l))
    setActiveLink(prev => prev?.id === id ? { ...prev, is_favorite: !prev.is_favorite } : prev)
    addToast(isFav ? 'Removed from favorites' : 'Added to favorites')
  }

  function resetFilters() {
    setCategory('all')
    setSelectedStatuses([])
    setSelectedTags([])
    setTagMode('any')
    setSortBy('newest')
    setSearchQuery('')
  }

  const byCategory = category === 'all' ? links : links.filter(l => l.content_type === category)

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
          ? l.title.toLowerCase().includes(plainQuery) ||
            l.site_name.toLowerCase().includes(plainQuery) ||
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
      case 'alphabetical': return a.title.localeCompare(b.title)
      case 'status':       return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      default:             return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const activeFilterCount = (sortBy !== 'newest' ? 1 : 0) + (category !== 'all' ? 1 : 0) + selectedStatuses.length + selectedTags.length
  const hasActiveFilters = activeFilterCount > 0 || query.length > 0

  return {
    links,
    category,
    modalOpen,
    filterOpen,
    searchQuery,
    selectedTags,
    tagMode,
    selectedStatuses,
    sortBy,
    activeLink,
    editingLink,
    results,
    isHashTagSearch,
    activeFilterCount,
    hasActiveFilters,
    setCategory,
    setModalOpen,
    setFilterOpen,
    setSearchQuery,
    setSelectedTags,
    setTagMode,
    setSelectedStatuses,
    setSortBy,
    setActiveLink,
    setEditingLink,
    handleStatusChange,
    handleEdit,
    handleDelete,
    handleFavoriteToggle,
    resetFilters,
    addToast,
  }
}
