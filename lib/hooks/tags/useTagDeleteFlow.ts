'use client'

import { useState } from 'react'
import { deleteTag as deleteTagService, getTagLinksCount, type TagWithCount } from '@/lib/services/tags/tags'

export function useTagDeleteFlow(
  setTags: React.Dispatch<React.SetStateAction<TagWithCount[]>>,
  refetchTags: () => void,
) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function confirmDelete(id: string) { setDeletingId(id); setDeleteError(null) }
  function cancelDeleting() { setDeletingId(null) }

  async function deleteTag(id: string) {
    const count = await getTagLinksCount(id)
    if (count > 0) {
      setDeleteError(`This tag has ${count} link${count === 1 ? '' : 's'} and cannot be deleted.`)
      return
    }
    const ok = await deleteTagService(id)
    if (!ok) { setDeleteError('Could not delete tag. Please try again.'); return }
    setTags(prev => prev.filter(t => t.id !== id))
    setDeletingId(null)
    setDeleteError(null)
    refetchTags()
  }

  return {
    deletingId,
    setDeletingId,
    deleteError,
    setDeleteError,
    confirmDelete,
    deleteTag,
    cancelDeleting,
  }
}
