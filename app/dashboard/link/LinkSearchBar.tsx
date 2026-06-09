'use client'

import { useLinkListContext } from './LinkListContext'

export default function LinkSearchBar() {
  const { searchQuery, isHashTagSearch, activeFilterCount, setSearchQuery, setFilterOpen } = useLinkListContext()

  return (
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
          className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 ${
            isHashTagSearch
              ? 'border-indigo-400 focus:border-indigo-500 focus:ring-indigo-500/20 ring-1 ring-indigo-300 dark:border-indigo-500'
              : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700'
          }`}
        />
      </div>
      <button
        onClick={() => setFilterOpen(true)}
        className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
          activeFilterCount > 0
            ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-800'
            : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100'
        }`}
      >
        <span aria-hidden="true">⚡</span>
        Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
      </button>
    </div>
  )
}
