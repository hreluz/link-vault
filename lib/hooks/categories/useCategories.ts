'use client'

import { useState, useEffect } from 'react'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryLinksCount,
  PROTECTED_CATEGORY_NAME,
  type Category,
} from '@/lib/services/categories'
import { useVault } from '@/lib/context/VaultContext'

export function useCategories() {
  const { dek } = useVault()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [newIcon, setNewIcon] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('indigo')
  const [addDomainsAfterCreate, setAddDomainsAfterCreate] = useState(true)
  const [createdCategory, setCreatedCategory] = useState<Category | null>(null)
  const [editIcon, setEditIcon] = useState('')
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('indigo')

  useEffect(() => {
    if (!dek) return
    getCategories(dek).then(data => {
      setCategories(data)
      setLoading(false)
    })
  }, [dek])

  function openAdd() { setAdding(true); setAddError(null); setEditingId(null); setDeletingId(null) }
  function closeAdd() { setAdding(false); setAddError(null); setNewIcon(''); setNewName(''); setNewColor('indigo'); setAddDomainsAfterCreate(true) }

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

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditIcon(cat.emoticon ?? '')
    setEditName(cat.name)
    setEditColor(cat.color ?? 'indigo')
    setEditError(null)
    setDeletingId(null)
    setAdding(false)
  }

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

  function confirmDelete(id: string) {
    const cat = categories.find(c => c.id === id)
    if (cat?.name === PROTECTED_CATEGORY_NAME) return
    setDeletingId(id); setEditingId(null); setAdding(false); setDeleteError(null)
  }

  async function handleDelete(id: string) {
    const cat = categories.find(c => c.id === id)
    if (cat?.name === PROTECTED_CATEGORY_NAME) return
    const count = await getCategoryLinksCount(id)
    if (count > 0) {
      setDeleteError(`This category has ${count} link${count === 1 ? '' : 's'} and cannot be deleted.`)
      return
    }
    const ok = await deleteCategory(id)
    if (ok) setCategories(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
    setDeleteError(null)
  }

  return {
    categories,
    loading,
    adding,
    addError,
    editingId,
    editError,
    setEditingId,
    deletingId,
    setDeletingId,
    deleteError,
    setDeleteError,
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
    editIcon,
    setEditIcon,
    editName,
    setEditName,
    editColor,
    setEditColor,
    openAdd,
    closeAdd,
    handleAdd,
    startEdit,
    handleSaveEdit,
    confirmDelete,
    handleDelete,
  }
}
