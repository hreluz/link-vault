'use client'

import { useState } from 'react'
import { MOCK_LINKS, type MockLink } from '@/lib/mock-data'
import type { ContentType, LinkStatus } from '@/lib/types/database'
import { CONTENT_TYPE_FILTERS } from '../config'
import LinkCard from './LinkCard'
import AddLinkModal from './AddLinkModal'
import BottomSheet from './BottomSheet'

type Filter = ContentType | 'all'

export default function LinkList() {
  const [filter, setFilter] = useState<Filter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeLink, setActiveLink] = useState<MockLink | null>(null)
  const [statuses, setStatuses] = useState<Record<string, LinkStatus>>(
    () => Object.fromEntries(MOCK_LINKS.map(l => [l.id, l.status]))
  )

  function toggleSearch() {
    if (searchOpen) {
      setSearchOpen(false)
      setSearchQuery('')
    } else {
      setSearchOpen(true)
    }
  }

  function handleStatusChange(id: string, status: LinkStatus) {
    setStatuses(prev => ({ ...prev, [id]: status }))
  }

  const byCategory = (filter === 'all' ? MOCK_LINKS : MOCK_LINKS.filter(l => l.content_type === filter))
    .map(l => ({ ...l, status: statuses[l.id] }))

  const query = searchQuery.trim().toLowerCase()
  const results = query
    ? byCategory.filter(l =>
        l.title.toLowerCase().includes(query) ||
        l.site_name.toLowerCase().includes(query) ||
        l.tags.some(t => t.toLowerCase().includes(query))
      )
    : byCategory

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Links</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {results.length} link{results.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={toggleSearch}
            aria-pressed={searchOpen}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              searchOpen
                ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            🔍 Search
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            + Add link
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
              🔍
            </span>
            <input
              autoFocus
              type="search"
              placeholder="Search by title, domain, or tag…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={toggleSearch}
            aria-label="Close search"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {CONTENT_TYPE_FILTERS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as Filter)}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === tab.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(link => (
            <LinkCard key={link.id} link={link} onMenuOpen={() => setActiveLink(link)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">{query ? '🔎' : '📭'}</div>
          <p className="text-slate-500">
            {query ? `No links found for "${searchQuery}"` : 'No links in this category yet.'}
          </p>
          {query && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      <AddLinkModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <BottomSheet
        link={activeLink}
        currentStatus={activeLink ? statuses[activeLink.id] : 'unread'}
        onStatusChange={handleStatusChange}
        onClose={() => setActiveLink(null)}
      />
    </main>
  )
}
