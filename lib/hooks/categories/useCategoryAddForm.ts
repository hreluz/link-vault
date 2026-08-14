'use client'

import { useState } from 'react'
import { createCategory, type Category } from '@/lib/services/categories'

export function useCategoryAddForm(
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>,
  dek: CryptoKey | null,
) {
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [newIcon, setNewIcon] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('indigo')
  const [addDomainsAfterCreate, setAddDomainsAfterCreate] = useState(true)
  const [createdCategory, setCreatedCategory] = useState<Category | null>(null)

  function openAdd() { setAdding(true); setAddError(null) }
  function closeAdd() { setAdding(false); setAddError(null); setNewIcon(''); setNewName(''); setNewColor('indigo'); setAddDomainsAfterCreate(true) }
  function cancelAdding() { setAdding(false) }

  async function handleAdd() {
    if (!newName.trim() || !dek) return
    const result = await createCategory({ name: newName.trim(), emoticon: newIcon.trim() || '🔗', color: newColor }, dek)
    if (result.error === 'name_taken') {
      setAddError('A category with that name already exists.')
      return
    }
    if (result.data) {
      setCategories(prev => [...prev, result.data])
      if (addDomainsAfterCreate) setCreatedCategory(result.data)
    }
    closeAdd()
  }

  return {
    adding,
    addError,
    newIcon,
    setNewIcon,
    newName,
    setNewName,
    newColor,
    setNewColor,
    addDomainsAfterCreate,
    setAddDomainsAfterCreate,
    createdCategory,
    setCreatedCategory,
    openAdd,
    closeAdd,
    handleAdd,
    cancelAdding,
  }
}
