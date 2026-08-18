'use client'

import { type TagWithCount } from '@/lib/services/tags/tags'
import { useTagsContext } from '@/lib/context/TagsContext'
import { useVault } from '@/lib/context/VaultContext'
import { useAvailableTagsWithIds } from './useAvailableTags'
import { useTagListState } from './useTagListState'
import { useTagAddForm } from './useTagAddForm'
import { useTagEditForm } from './useTagEditForm'
import { useTagDeleteFlow } from './useTagDeleteFlow'
import { useTagMergeForm } from './useTagMergeForm'

export type { TagWithCount }

export function useTagList() {
  const { dek } = useVault()
  const { refetchTags } = useTagsContext()
  const availableTags = useAvailableTagsWithIds()
  const { tags, setTags, loading, search, setSearch } = useTagListState(dek)
  const addForm = useTagAddForm(setTags, dek, refetchTags)
  const editForm = useTagEditForm(setTags, dek, refetchTags)
  const deleteFlow = useTagDeleteFlow(setTags, refetchTags)
  const mergeForm = useTagMergeForm(setTags, refetchTags, availableTags)

  function openAdd() {
    editForm.cancelEditing()
    deleteFlow.cancelDeleting()
    mergeForm.cancelMerging()
    addForm.openAdd()
  }

  function startEdit(tag: TagWithCount) {
    addForm.cancelAdding()
    deleteFlow.cancelDeleting()
    mergeForm.cancelMerging()
    editForm.startEdit(tag)
  }

  function confirmDelete(id: string) {
    addForm.cancelAdding()
    editForm.cancelEditing()
    mergeForm.cancelMerging()
    deleteFlow.confirmDelete(id)
  }

  function startMerge(tag: TagWithCount) {
    addForm.cancelAdding()
    editForm.cancelEditing()
    deleteFlow.cancelDeleting()
    mergeForm.startMerge(tag)
  }

  return {
    tags,
    loading,
    search,
    setSearch,
    ...addForm,
    ...editForm,
    ...deleteFlow,
    ...mergeForm,
    openAdd,
    startEdit,
    confirmDelete,
    startMerge,
  }
}
