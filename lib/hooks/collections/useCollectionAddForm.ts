'use client'

import { useState } from 'react'
import { createCollection, type Collection } from '@/lib/services/collections'

export const NAME_REQUIRED_ERROR = 'Name is required.'
export const SAVE_ERROR = "Couldn't save the collection. Try again."

export function useCollectionAddForm(
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>,
  dek: CryptoKey | null,
) {
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [newDescription, setNewDescription] = useState('')

  function openAdd() { setAdding(true); setAddError(null) }
  function closeAdd() { setAdding(false); setAddError(null); setNewName(''); setNewEmoji(''); setNewDescription('') }
  function cancelAdding() { setAdding(false) }

  /** Resolves true when the collection was saved. */
  async function handleAdd(): Promise<boolean> {
    if (!dek || saving) return false
    if (!newName.trim()) {
      setAddError(NAME_REQUIRED_ERROR)
      return false
    }
    setSaving(true)
    const result = await createCollection({ name: newName, emoji: newEmoji || null, description: newDescription }, dek)
    setSaving(false)
    if (result.error === 'name_required') {
      setAddError(NAME_REQUIRED_ERROR)
      return false
    }
    if (result.error) {
      setAddError(SAVE_ERROR)
      return false
    }
    setCollections(prev => [result.data, ...prev])
    closeAdd()
    return true
  }

  return {
    adding, addError, saving,
    newName, setNewName, newEmoji, setNewEmoji, newDescription, setNewDescription,
    openAdd, closeAdd, cancelAdding, handleAdd,
  }
}
