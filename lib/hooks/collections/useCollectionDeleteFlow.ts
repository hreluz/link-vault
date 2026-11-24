'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCollection, type Collection } from '@/lib/services/collections'
import { useToast } from '@/components/ToastProvider'

/** Inline delete confirm. Hard delete; the links stay saved. Navigates back to the list on success. */
export function useCollectionDeleteFlow(collection: Collection | null) {
  const router = useRouter()
  const { addToast } = useToast()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function askDelete() { setConfirmingDelete(true) }
  function cancelDelete() { setConfirmingDelete(false) }

  async function handleDelete() {
    if (!collection || deleting) return
    setDeleting(true)
    const ok = await deleteCollection(collection.id)
    setDeleting(false)
    if (!ok) {
      addToast('Failed to delete collection', 'destructive')
      return
    }
    setConfirmingDelete(false)
    addToast(`Deleted ${collection.name}`)
    router.push('/dashboard/organize/collections')
  }

  return { confirmingDelete, deleting, askDelete, cancelDelete, handleDelete }
}
