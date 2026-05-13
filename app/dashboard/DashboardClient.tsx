'use client'

import { useState } from 'react'
import { MOCK_LINKS } from '@/lib/mock-data'
import type { ContentType } from '@/lib/types/database'
import { CONTENT_TYPE_FILTERS } from './config'
import LinkCard from './LinkCard'
import AddLinkModal from './AddLinkModal'
import LogoutButton from './LogoutButton'

type Filter = ContentType | 'all'

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  function toggleSearch() {
    if (searchOpen) {
      setSearchOpen(false)
      setSearchQuery('')
    } else {
      setSearchOpen(true)
    }
  }

  const byCategory = filter === 'all'
    ? MOCK_LINKS
    : MOCK_LINKS.filter(l => l.content_type === filter)

  const query = searchQuery.trim().toLowerCase()
  const results = query
    ? byCategory.filter(l =>
        l.title.toLowerCase().includes(query) ||
        l.site_name.toLowerCase().includes(query) ||
        l.tags.some(t => t.toLowerCase().includes(query))
      )
    : byCategory

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">🔖</span>
            <span className="font-semibold text-slate-900">Link Vault</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">{userEmail}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

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
              <LinkCard key={link.id} link={link} />
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
      </main>

      <AddLinkModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
