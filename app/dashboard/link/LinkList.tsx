'use client'

import { useState } from 'react'
import { MOCK_LINKS, type MockLink } from '@/lib/mock-data'
import type { ContentType, LinkStatus } from '@/lib/types/database'
import { CONTENT_TYPE_CONFIG, STATUS_CONFIG } from '../config'
import { useToast } from '@/components/ToastProvider'
import LinkCard from './LinkCard'
import AddLinkModal from './AddLinkModal'
import EditLinkModal from './EditLinkModal'
import BottomSheet from './BottomSheet'
import FilterSheet, { type SortBy } from './FilterSheet'

type Filter = ContentType | 'all'

const STATUS_ORDER: Record<LinkStatus, number> = {
  unread: 0, watching: 1, read: 2, favorite: 3, archived: 4,
}

const SORT_LABELS: Record<SortBy, string> = {
  newest: 'Newest first', oldest: 'Oldest first', alphabetical: 'A → Z', status: 'By status',
}

export default function LinkList() {
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
      case 'oldest':      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'alphabetical': return a.title.localeCompare(b.title)
      case 'status':      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      default:            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const activeFilterCount = (sortBy !== 'newest' ? 1 : 0) + (category !== 'all' ? 1 : 0) + selectedStatuses.length + selectedTags.length
  const hasActiveFilters = activeFilterCount > 0 || query.length > 0

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Links</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {results.length} link{results.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          + Add link
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            placeholder="Search by title, domain, tag… or #tag for tag-only"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 ${
              isHashTagSearch
                ? 'border-indigo-400 focus:border-indigo-500 focus:ring-indigo-500/20 ring-1 ring-indigo-300'
                : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
            }`}
          />
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
            activeFilterCount > 0
              ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
              : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <span aria-hidden="true">⚡</span>
          Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
        </button>
      </div>

      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {sortBy !== 'newest' && (
            <button
              onClick={() => setSortBy('newest')}
              className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200"
            >
              {SORT_LABELS[sortBy]}
              <span className="text-indigo-400" aria-hidden="true">✕</span>
            </button>
          )}
          {category !== 'all' && (
            <button
              onClick={() => setCategory('all')}
              className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200"
            >
              {CONTENT_TYPE_CONFIG[category].icon} {CONTENT_TYPE_CONFIG[category].label}
              <span className="text-indigo-400" aria-hidden="true">✕</span>
            </button>
          )}
          {selectedStatuses.map(s => (
            <button
              key={s}
              onClick={() => setSelectedStatuses(prev => prev.filter(x => x !== s))}
              className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200"
            >
              {STATUS_CONFIG[s].label}
              <span className="text-indigo-400" aria-hidden="true">✕</span>
            </button>
          ))}
          {selectedTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
              className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-200"
            >
              {tag}
              <span className="text-indigo-400" aria-hidden="true">✕</span>
            </button>
          ))}
          <button
            onClick={resetFilters}
            className="text-sm text-slate-400 transition hover:text-slate-600"
          >
            Clear all
          </button>
        </div>
      )}

      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(link => (
            <LinkCard key={link.id} link={link} onMenuOpen={() => setActiveLink(link)} onFavoriteToggle={() => handleFavoriteToggle(link.id)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">📭</div>
          <p className="text-slate-500">No links match the current filters.</p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <AddLinkModal isOpen={modalOpen} onSave={() => addToast('Link saved')} onClose={() => setModalOpen(false)} />

      <EditLinkModal
        link={editingLink}
        onSave={handleEdit}
        onClose={() => setEditingLink(null)}
      />

      <FilterSheet
        isOpen={filterOpen}
        sortBy={sortBy}
        category={category}
        selectedStatuses={selectedStatuses}
        selectedTags={selectedTags}
        tagMode={tagMode}
        resultCount={results.length}
        onSortChange={setSortBy}
        onCategoryChange={setCategory}
        onStatusesChange={setSelectedStatuses}
        onTagsChange={setSelectedTags}
        onTagModeChange={setTagMode}
        onReset={resetFilters}
        onClose={() => setFilterOpen(false)}
      />

      <BottomSheet
        link={activeLink}
        onStatusChange={handleStatusChange}
        onFavoriteToggle={() => activeLink && handleFavoriteToggle(activeLink.id)}
        onEdit={() => setEditingLink(activeLink)}
        onDelete={handleDelete}
        onClose={() => setActiveLink(null)}
      />
    </main>
  )
}
