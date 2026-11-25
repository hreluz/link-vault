'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { updateCollection, type Collection } from '@/lib/services/collections'
import { NAME_REQUIRED_ERROR, SAVE_ERROR } from './useCollectionAddForm'

/** Inline rename / emoji / description form on the collection page. */
export function useCollectionEditForm(
  collection: Collection | null,
  setCollection: Dispatch<SetStateAction<Collection | null>>,
  dek: CryptoKey | null,
) {
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editDescription, setEditDescription] = useState('')

  function startEdit() {
    if (!collection) return
    setEditName(collection.name)
    setEditEmoji(collection.emoji ?? '')
    setEditDescription(collection.description ?? '')
    setEditError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditError(null)
  }

  async function handleSaveEdit() {
    if (!collection || !dek || saving) return
    if (!editName.trim()) {
      setEditError(NAME_REQUIRED_ERROR)
      return
    }
    setSaving(true)
    const result = await updateCollection(
      { id: collection.id, name: editName, emoji: editEmoji || null, description: editDescription },
      dek,
    )
    setSaving(false)
    if (result.error) {
      setEditError(result.error === 'name_required' ? NAME_REQUIRED_ERROR : SAVE_ERROR)
      return
    }
    setCollection(result.data)
    setEditing(false)
  }

  return {
    editing, editError, saving,
    editName, setEditName, editEmoji, setEditEmoji, editDescription, setEditDescription,
    startEdit, cancelEdit, handleSaveEdit,
  }
}
