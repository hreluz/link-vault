'use client'

import { useState, useEffect } from 'react'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '@/lib/services/categories'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newIcon, setNewIcon] = useState('')
  const [newName, setNewName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editName, setEditName] = useState('')

  useEffect(() => {
    getCategories().then(data => {
      setCategories(data)
      setLoading(false)
    })
  }, [])

  function openAdd() { setAdding(true); setAddError(null); setEditingId(null); setDeletingId(null) }
  function closeAdd() { setAdding(false); setAddError(null); setNewIcon(''); setNewName('') }

  async function handleAdd() {
    if (!newName.trim()) return
    const result = await createCategory({ name: newName.trim(), emoticon: newIcon.trim() || '🔗' })
    if (result.error === 'name_taken') {
      setAddError('A category with that name already exists.')
      return
    }
    if (result.data) setCategories(prev => [...prev, result.data])
    closeAdd()
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditIcon(cat.emoticon ?? '')
    setEditName(cat.name)
    setEditError(null)
    setDeletingId(null)
    setAdding(false)
  }

  async function handleSaveEdit() {
    if (!editName.trim() || !editingId) return
    const result = await updateCategory({ id: editingId, name: editName.trim(), emoticon: editIcon.trim() || '🔗' })
    if (result.error === 'name_taken') {
      setEditError('A category with that name already exists.')
      return
    }
    if (result.data) setCategories(prev => prev.map(c => c.id === editingId ? result.data : c))
    setEditingId(null)
    setEditError(null)
  }

  function confirmDelete(id: string) { setDeletingId(id); setEditingId(null); setAdding(false) }

  async function handleDelete(id: string) {
    const ok = await deleteCategory(id)
    if (ok) setCategories(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
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
    newIcon,
    setNewIcon,
    newName,
    setNewName,
    editIcon,
    setEditIcon,
    editName,
    setEditName,
    openAdd,
    closeAdd,
    handleAdd,
    startEdit,
    handleSaveEdit,
    confirmDelete,
    handleDelete,
  }
}
