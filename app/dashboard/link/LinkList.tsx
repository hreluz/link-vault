'use client'

import { CONTENT_TYPE_CONFIG, STATUS_CONFIG } from '../config'
import LinkCard from './LinkCard'
import AddLinkModal from './AddLinkModal'
import EditLinkModal from './EditLinkModal'
import BottomSheet from './BottomSheet'
import FilterSheet, { type SortBy } from './FilterSheet'
import { useLinkList } from '@/lib/hooks/links'

const SORT_LABELS: Record<SortBy, string> = {
  newest: 'Newest first', oldest: 'Oldest first', alphabetical: 'A → Z', status: 'By status',
}

export default function LinkList() {
  const {
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
    allTags,
    loading,
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
    handleCreate,
    resetFilters,
    addToast,
  } = useLinkList()

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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : results.length > 0 ? (
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

      <AddLinkModal
        isOpen={modalOpen}
        onSuccess={link => { handleCreate(link); addToast('Link saved'); setModalOpen(false) }}
        onClose={() => setModalOpen(false)}
      />

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
        allTags={allTags}
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
