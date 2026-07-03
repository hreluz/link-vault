'use client'

import { useLinkListContext } from './LinkListContext'

export default function FavoritesToggle() {
  const { favoritesOnly, setFavoritesOnly } = useLinkListContext()

  return (
    <div className="mb-4 flex gap-2">
      <button
        onClick={() => setFavoritesOnly(false)}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
          !favoritesOnly
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
        }`}
      >
        All Links
      </button>
      <button
        onClick={() => setFavoritesOnly(true)}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
          favoritesOnly
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
        }`}
      >
        ⭐ Favorites
      </button>
    </div>
  )
}
