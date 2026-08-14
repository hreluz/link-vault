'use client'

import { type Category } from '@/lib/services/categories'
import { useVault } from '@/lib/context/VaultContext'
import { useCategoryListState } from './useCategoryListState'
import { useCategoryAddForm } from './useCategoryAddForm'
import { useCategoryEditForm } from './useCategoryEditForm'
import { useCategoryDeleteFlow } from './useCategoryDeleteFlow'

export function useCategories() {
  const { dek } = useVault()
  const { categories, setCategories, loading, search, setSearch, filteredCategories } = useCategoryListState(dek)
  const addForm = useCategoryAddForm(setCategories, dek)
  const editForm = useCategoryEditForm(setCategories, dek)
  const deleteFlow = useCategoryDeleteFlow(categories, setCategories)

  function openAdd() {
    editForm.cancelEditing()
    deleteFlow.cancelDeleting()
    addForm.openAdd()
  }

  function startEdit(cat: Category) {
    addForm.cancelAdding()
    deleteFlow.cancelDeleting()
    editForm.startEdit(cat)
  }

  function confirmDelete(id: string) {
    addForm.cancelAdding()
    editForm.cancelEditing()
    deleteFlow.confirmDelete(id)
  }

  return {
    categories,
    filteredCategories,
    search,
    setSearch,
    loading,
    ...addForm,
    ...editForm,
    ...deleteFlow,
    openAdd,
    startEdit,
    confirmDelete,
  }
}
