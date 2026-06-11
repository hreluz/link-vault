'use client'

import { useState, useEffect } from 'react'
import { COLORS } from '@/components/ColorPicker'
import {
  getTags,
  createTag,
  updateTag,
  deleteTag as deleteTagService,
  getTagLinksCount,
  toKebabCase,
  type TagWithCount,
} from '@/lib/services/tags'

export type { TagWithCount }

export function useTagList() {
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [addError, setAddError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0].value)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  useEffect(() => {
    getTags().then(data => {
      setTags(data)
      setLoading(false)
    })
  }, [])

  function openAdd() { setAdding(true); setAddError(null); setEditingId(null); setDeletingId(null) }
  function closeAdd() { setAdding(false); setAddError(null); setNewName(''); setNewColor(COLORS[0].value) }

  async function addTag() {
    const name = toKebabCase(newName)
    if (!name) return
    setAddError(null)
    const result = await createTag({ name, color: newColor })
    if (result.error === 'name_taken') { setAddError('A tag with that name already exists.'); return }
    if (result.error) { setAddError('Something went wrong. Please try again.'); return }
    setTags(prev => [...prev, { ...result.data, link_count: 0 }])
    closeAdd()
  }

  function startEdit(tag: TagWithCount) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color ?? COLORS[0].value)
    setEditError(null)
    setDeletingId(null)
    setAdding(false)
  }

  async function saveEdit() {
    const name = toKebabCase(editName)
    if (!name || !editingId) return
    setEditError(null)
    const result = await updateTag({ id: editingId, name, color: editColor })
    if (result.error === 'name_taken') { setEditError('A tag with that name already exists.'); return }
    if (result.error) { setEditError('Something went wrong. Please try again.'); return }
    setTags(prev => prev.map(t =>
      t.id === editingId ? { ...t, name: result.data.name, color: result.data.color } : t
    ))
    setEditingId(null)
  }

  function confirmDelete(id: string) { setDeletingId(id); setEditingId(null); setAdding(false); setDeleteError(null) }

  async function removeTag(id: string) {
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
  }

  return {
    tags, loading, addError, editError, adding, editingId, deletingId, deleteError,
    newName, newColor, editName, editColor,
    setNewName, setNewColor, setEditName, setEditColor, setEditingId, setDeletingId, setDeleteError,
    openAdd, closeAdd, addTag, startEdit, saveEdit, confirmDelete,
    deleteTag: removeTag,
  }
}
