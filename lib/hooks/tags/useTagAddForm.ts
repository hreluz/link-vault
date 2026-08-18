'use client'

import { useState } from 'react'
import { COLORS } from '@/components/ColorPicker'
import { createTag, toKebabCase, type TagWithCount } from '@/lib/services/tags/tags'

export function useTagAddForm(
  setTags: React.Dispatch<React.SetStateAction<TagWithCount[]>>,
  dek: CryptoKey | null,
  refetchTags: () => void,
) {
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0].value)
  const [newIsPrivate, setNewIsPrivate] = useState(false)

  function openAdd() { setAdding(true); setAddError(null) }
  function closeAdd() { setAdding(false); setAddError(null); setNewName(''); setNewColor(COLORS[0].value); setNewIsPrivate(false) }
  function cancelAdding() { setAdding(false) }

  async function addTag() {
    const name = toKebabCase(newName)
    if (!name || !dek) return
    setAddError(null)
    const result = await createTag({ name, color: newColor, is_private: newIsPrivate }, dek)
    if (result.error === 'name_taken') { setAddError('A tag with that name already exists.'); return }
    if (result.error) { setAddError('Something went wrong. Please try again.'); return }
    setTags(prev => [...prev, { ...result.data, link_count: 0 }])
    closeAdd()
    refetchTags()
  }

  return {
    adding,
    addError,
    newName,
    setNewName,
    newColor,
    setNewColor,
    newIsPrivate,
    setNewIsPrivate,
    openAdd,
    closeAdd,
    addTag,
    cancelAdding,
  }
}
