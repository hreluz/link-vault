'use client'

import { useVault } from '@/lib/context/VaultContext'
import { useCollectionListState } from './useCollectionListState'
import { useCollectionAddForm } from './useCollectionAddForm'

/** Collections list page: list state + the inline `+ New` form. */
export function useCollections() {
  const { dek } = useVault()
  const list = useCollectionListState(dek)
  const addForm = useCollectionAddForm(list.setCollections, dek)
  return { ...list, ...addForm }
}
