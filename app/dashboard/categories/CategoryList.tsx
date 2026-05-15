'use client'

import { useState } from 'react'
import { MOCK_LINKS } from '@/lib/mock-data'
import { CONTENT_TYPE_CONFIG } from '../config'
import type { ContentType } from '@/lib/types/database'

interface Category {
  id: string
  icon: string
  name: string
}

const INITIAL_CATEGORIES: Category[] = (Object.keys(CONTENT_TYPE_CONFIG) as ContentType[]).map(key => ({
  id: key,
  icon: CONTENT_TYPE_CONFIG[key].icon,
  name: CONTENT_TYPE_CONFIG[key].label,
}))

function linkCount(categoryId: string) {
  return MOCK_LINKS.filter(l => l.content_type === categoryId).length
}

export default function CategoryList() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newIcon, setNewIcon] = useState('')
  const [newName, setNewName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editName, setEditName] = useState('')

  function openAdd() { setAdding(true); setEditingId(null); setDeletingId(null) }
  function closeAdd() { setAdding(false); setNewIcon(''); setNewName('') }

  function addCategory() {
    if (!newName.trim()) return
    setCategories(prev => [...prev, {
      id: Date.now().toString(),
      icon: newIcon.trim() || '🔗',
      name: newName.trim(),
    }])
    closeAdd()
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditIcon(cat.icon)
    setEditName(cat.name)
    setDeletingId(null)
    setAdding(false)
  }

  function saveEdit() {
    if (!editName.trim()) return
    setCategories(prev => prev.map(c =>
      c.id === editingId ? { ...c, icon: editIcon.trim() || '🔗', name: editName.trim() } : c
    ))
    setEditingId(null)
  }

  function confirmDelete(id: string) { setDeletingId(id); setEditingId(null); setAdding(false) }
  function deleteCategory(id: string) { setCategories(prev => prev.filter(c => c.id !== id)); setDeletingId(null) }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="mt-0.5 text-sm text-slate-500">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        {!adding && (
          <button
            onClick={openAdd}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            + New category
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="mb-3 text-sm font-semibold text-slate-700">New category</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Icon"
              value={newIcon}
              onChange={e => setNewIcon(e.target.value)}
              className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-lg outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              autoFocus
              type="text"
              placeholder="Category name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') closeAdd() }}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={closeAdd}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={addCategory}
              disabled={!newName.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add category
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.map(cat => {
          const count = linkCount(cat.id)
          const isEditing = editingId === cat.id
          const isDeleting = deletingId === cat.id

          if (isEditing) {
            return (
              <div key={cat.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-200">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={editIcon}
                    onChange={e => setEditIcon(e.target.value)}
                    className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-lg outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={!editName.trim()}
                    className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div key={cat.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200">
              <span className="text-xl" aria-hidden="true">{cat.icon}</span>
              <span className="text-sm font-medium text-slate-900">{cat.name}</span>
              <span className="text-xs text-slate-400">{count} link{count !== 1 ? 's' : ''}</span>
              <div className="ml-auto flex items-center gap-1">
                {isDeleting ? (
                  <>
                    <span className="mr-1 text-xs text-slate-500">Delete?</span>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(cat)}
                      aria-label="Edit category"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => confirmDelete(cat.id)}
                      aria-label="Delete category"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">📂</div>
          <p className="text-slate-500">No categories yet. Create your first one.</p>
        </div>
      )}
    </main>
  )
}
