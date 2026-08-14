'use client'

import { type TagWithCount } from '@/lib/services/tags'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useVault } from '@/lib/context/VaultContext'
import { useTagListState } from './useTagListState'
import { useTagAddForm } from './useTagAddForm'
import { useTagEditForm } from './useTagEditForm'
import { useTagDeleteFlow } from './useTagDeleteFlow'

export type { TagWithCount }

export function useTagList() {
  const { dek } = useVault()
  const { refetchTags } = useTagsContext()
  const { tags, setTags, loading, search, setSearch } = useTagListState(dek)
  const addForm = useTagAddForm(setTags, dek, refetchTags)
  const editForm = useTagEditForm(setTags, dek, refetchTags)
  const deleteFlow = useTagDeleteFlow(setTags, refetchTags)

  function openAdd() {
    editForm.cancelEditing()
    deleteFlow.cancelDeleting()
    addForm.openAdd()
  }

  function startEdit(tag: TagWithCount) {
    addForm.cancelAdding()
    deleteFlow.cancelDeleting()
    editForm.startEdit(tag)
  }

  function confirmDelete(id: string) {
    addForm.cancelAdding()
    editForm.cancelEditing()
    deleteFlow.confirmDelete(id)
  }

  return {
    tags,
    loading,
    search,
    setSearch,
    ...addForm,
    ...editForm,
    ...deleteFlow,
    openAdd,
    startEdit,
    confirmDelete,
  }
}
