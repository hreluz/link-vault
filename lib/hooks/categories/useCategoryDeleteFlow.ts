'use client'

import { useState } from 'react'
import {
  deleteCategory,
  getCategoryLinksCount,
  PROTECTED_CATEGORY_NAME,
  type Category,
} from '@/lib/services/categories'

export function useCategoryDeleteFlow(
  categories: Category[],
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>,
) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function confirmDelete(id: string) {
    const cat = categories.find(c => c.id === id)
    if (cat?.name === PROTECTED_CATEGORY_NAME) return
    setDeletingId(id); setDeleteError(null)
  }

  function cancelDeleting() { setDeletingId(null) }

  async function handleDelete(id: string) {
    const cat = categories.find(c => c.id === id)
    if (cat?.name === PROTECTED_CATEGORY_NAME) return
    const count = await getCategoryLinksCount(id)
    if (count > 0) {
      setDeleteError(`This category has ${count} link${count === 1 ? '' : 's'} and cannot be deleted.`)
      return
    }
    const ok = await deleteCategory(id)
    if (ok) setCategories(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
    setDeleteError(null)
  }

  return {
    deletingId,
    setDeletingId,
    deleteError,
    setDeleteError,
    confirmDelete,
    handleDelete,
    cancelDeleting,
  }
}
