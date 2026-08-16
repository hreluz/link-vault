'use client'

import { useState } from 'react'
import { COLORS } from '@/components/ColorPicker'
import { updateTag, toKebabCase, type TagWithCount } from '@/lib/services/tags'

export function useTagEditForm(
  setTags: React.Dispatch<React.SetStateAction<TagWithCount[]>>,
  dek: CryptoKey | null,
  refetchTags: () => void,
) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editIsPrivate, setEditIsPrivate] = useState(false)

  function startEdit(tag: TagWithCount) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color ?? COLORS[0].value)
    setEditIsPrivate(tag.is_private)
    setEditError(null)
  }

  function cancelEditing() { setEditingId(null) }

  async function saveEdit() {
    const name = toKebabCase(editName)
    if (!name || !editingId || !dek) return
    setEditError(null)
    const result = await updateTag({ id: editingId, name, color: editColor, is_private: editIsPrivate }, dek)
    if (result.error === 'name_taken') { setEditError('A tag with that name already exists. Use Merge to combine them.'); return }
    if (result.error) { setEditError('Something went wrong. Please try again.'); return }
    setTags(prev => prev.map(t =>
      t.id === editingId ? { ...t, name: result.data.name, color: result.data.color, is_private: result.data.is_private } : t
    ))
    setEditingId(null)
    refetchTags()
  }

  return {
    editingId,
    setEditingId,
    editError,
    editName,
    setEditName,
    editColor,
    setEditColor,
    editIsPrivate,
    setEditIsPrivate,
    startEdit,
    saveEdit,
    cancelEditing,
  }
}
