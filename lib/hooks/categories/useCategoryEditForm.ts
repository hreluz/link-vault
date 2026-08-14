'use client'

import { useState } from 'react'
import { updateCategory, type Category } from '@/lib/services/categories'

export function useCategoryEditForm(
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>,
  dek: CryptoKey | null,
) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editIcon, setEditIcon] = useState('')
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('indigo')

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditIcon(cat.emoticon ?? '')
    setEditName(cat.name)
    setEditColor(cat.color ?? 'indigo')
    setEditError(null)
  }

  function cancelEditing() { setEditingId(null) }

  async function handleSaveEdit() {
    if (!editName.trim() || !editingId || !dek) return
    const result = await updateCategory({ id: editingId, name: editName.trim(), emoticon: editIcon.trim() || '🔗', color: editColor }, dek)
    if (result.error === 'name_taken') {
      setEditError('A category with that name already exists.')
      return
    }
    if (result.data) setCategories(prev => prev.map(c => c.id === editingId ? result.data : c))
    setEditingId(null)
    setEditError(null)
  }

  return {
    editingId,
    setEditingId,
    editError,
    editIcon,
    setEditIcon,
    editName,
    setEditName,
    editColor,
    setEditColor,
    startEdit,
    handleSaveEdit,
    cancelEditing,
  }
}
