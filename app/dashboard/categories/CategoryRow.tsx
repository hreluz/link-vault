'use client'

import type { Category } from '@/lib/services/categories'
import { PROTECTED_CATEGORY_NAME } from '@/lib/services/categories'
import { colorForCategory } from './CategoryForm'
import { useCategoriesContext } from './CategoriesContext'

interface Props {
  category: Category
}

export default function CategoryRow({ category }: Props) {
  const { deletingId, setDeletingId, deleteError, setDeleteError, startEdit, confirmDelete, handleDelete } = useCategoriesContext()
  const isDeleting = deletingId === category.id
  const isProtected = category.name === PROTECTED_CATEGORY_NAME
  const color = colorForCategory(category.color)

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${color.dot}`} aria-hidden="true" />
      <span className="text-xl" aria-hidden="true">{category.emoticon}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{category.name}</span>
      <div className="ml-auto flex items-center gap-1">
        {isDeleting ? (
          <>
            {deleteError ? (
              <span className="mr-1 text-xs text-red-600 dark:text-red-400">{deleteError}</span>
            ) : (
              <span className="mr-1 text-xs text-slate-500 dark:text-slate-400">Delete?</span>
            )}
            <button
              onClick={() => { setDeletingId(null); setDeleteError(null) }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {deleteError ? 'OK' : 'Cancel'}
            </button>
            {!deleteError && (
              <button
                onClick={() => handleDelete(category.id)}
                className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                Delete
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => startEdit(category)}
              aria-label="Edit category"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              ✏️
            </button>
            {!isProtected && (
              <button
                onClick={() => confirmDelete(category.id)}
                aria-label="Delete category"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                🗑️
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
