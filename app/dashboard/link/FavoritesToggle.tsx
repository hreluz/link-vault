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
            ? 'bg-primary-600 text-white'
            : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'
        }`}
      >
        All Links
      </button>
      <button
        onClick={() => setFavoritesOnly(true)}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
          favoritesOnly
            ? 'bg-primary-600 text-white'
            : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'
        }`}
      >
        ⭐ Favorites
      </button>
    </div>
  )
}
