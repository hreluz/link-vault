'use client'

import { useFavoritesContext } from './FavoritesContext'

export default function FavoritesHeader() {
  const { links } = useFavoritesContext()
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Favorites</h1>
      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
        {links.length} link{links.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
