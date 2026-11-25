'use client'

import { useVault } from '@/lib/context/VaultContext'
import { useCollectionListState } from './useCollectionListState'
import { useCollectionAddForm } from './useCollectionAddForm'
import { useCollectionListSearch } from './useCollectionListSearch'

/** Collections list page: list state + the inline `+ New` form + the search box. */
export function useCollections() {
  const { dek } = useVault()
  const list = useCollectionListState(dek)
  const addForm = useCollectionAddForm(list.setCollections, dek)
  const search = useCollectionListSearch(list.collections)
  const { clearSearch } = search

  // A new collection would otherwise be hidden by the current filter.
  async function handleAdd() {
    const saved = await addForm.handleAdd()
    if (saved) clearSearch()
    return saved
  }

  return { ...list, ...addForm, ...search, handleAdd }
}
