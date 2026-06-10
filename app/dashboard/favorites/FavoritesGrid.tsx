'use client'

import LinkCard from '../link/LinkCard'
import { useFavoritesContext } from './FavoritesContext'

export default function FavoritesGrid() {
  const {
    results, hasActiveFilters, categories,
    resetFilters, setActiveLink, handleFavoriteToggle,
  } = useFavoritesContext()

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-4xl" aria-hidden="true">⭐</div>
        <p className="text-slate-500 dark:text-slate-400">
          {hasActiveFilters ? 'No favorites match your search.' : 'No favorites yet. Star a link to see it here.'}
        </p>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Clear filters
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {results.map(link => (
        <LinkCard
          key={link.id}
          link={link}
          category={categories.find(c => c.id === link.category_id) ?? null}
          onMenuOpen={() => setActiveLink(link)}
          onFavoriteToggle={() => handleFavoriteToggle(link.id)}
        />
      ))}
    </div>
  )
}
