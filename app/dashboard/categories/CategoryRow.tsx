'use client'

import type { Category } from '@/lib/services/categories'
import { PROTECTED_CATEGORY_NAME } from '@/lib/services/categories'
import { colorForCategory } from './CategoryForm'
import { useCategoriesContext } from './CategoriesContext'

interface Props {
  category: Category
}

export default function CategoryRow({ category }: Props) {
  const { deletingId, setDeletingId, startEdit, confirmDelete, handleDelete } = useCategoriesContext()
  const isDeleting = deletingId === category.id
  const isProtected = category.name === PROTECTED_CATEGORY_NAME
  const color = colorForCategory(category.color)

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200">
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${color.dot}`} aria-hidden="true" />
      <span className="text-xl" aria-hidden="true">{category.emoticon}</span>
      <span className="text-sm font-medium text-slate-900">{category.name}</span>
      <div className="ml-auto flex items-center gap-1">
        {isDeleting ? (
          <>
            <span className="mr-1 text-xs text-slate-500">Delete?</span>
            <button
              onClick={() => setDeletingId(null)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
            >
              Delete
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => startEdit(category)}
              aria-label="Edit category"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              ✏️
            </button>
            {!isProtected && (
              <button
                onClick={() => confirmDelete(category.id)}
                aria-label="Delete category"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
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
