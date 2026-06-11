'use client'

import { FavoritesProvider, useFavoritesContext } from './FavoritesContext'
import FavoritesHeader from './FavoritesHeader'
import FavoritesGrid from './FavoritesGrid'
import FavoritesModals from './FavoritesModals'
import SearchBar from '@/components/SearchBar'
import { StatusTabBar } from '../link/StatusTabBar'

function FavoritesContent() {
  const {
    loading,
    searchQuery, setSearchQuery,
    selectedStatuses, setSelectedStatuses,
    activeFilterCount, setFilterOpen,
  } = useFavoritesContext()

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Favorites</h1>
        </div>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <FavoritesHeader />
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        filterCount={activeFilterCount}
        onFilterOpen={() => setFilterOpen(true)}
      />
      <StatusTabBar
        value={selectedStatuses[0] ?? null}
        onChange={s => setSelectedStatuses(s ? [s] : [])}
      />
      <FavoritesGrid />
      <FavoritesModals />
    </main>
  )
}

export default function FavoritesList() {
  return (
    <FavoritesProvider>
      <FavoritesContent />
    </FavoritesProvider>
  )
}
