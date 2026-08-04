'use client'

import { useTrashContext } from './TrashContext'
import { useCategoryList } from '@/lib/hooks/categories/useCategoryList'
import TrashCard from './TrashCard'

export default function TrashGrid() {
  const { links, handleRestore, handleDeletePermanently } = useTrashContext()
  const { categories } = useCategoryList()

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-4xl" aria-hidden="true">🗑️</div>
        <p className="text-surface-500 dark:text-surface-400">No deleted links.</p>
      </div>
    )
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {links.map(link => (
        <TrashCard
          key={link.id}
          link={link}
          category={categories.find(c => c.id === link.category_id) ?? null}
          onRestore={() => handleRestore(link.id)}
          onDeletePermanently={() => handleDeletePermanently(link.id)}
        />
      ))}
    </div>
  )
}
