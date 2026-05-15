'use client'

import { useState } from 'react'
import { MOCK_LINKS } from '@/lib/mock-data'

const TAG_COLORS = [
  { value: 'indigo',  bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  { value: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { value: 'amber',   bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  { value: 'rose',    bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
  { value: 'sky',     bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  { value: 'purple',  bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500'  },
  { value: 'pink',    bg: 'bg-pink-100',    text: 'text-pink-700',    dot: 'bg-pink-500'    },
  { value: 'slate',   bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'   },
]

interface Tag {
  id: string
  name: string
  color: string
}

const INITIAL_TAGS: Tag[] = Array.from(new Set(MOCK_LINKS.flatMap(l => l.tags))).map((name, i) => ({
  id: String(i + 1),
  name,
  color: TAG_COLORS[i % TAG_COLORS.length].value,
}))

function colorFor(value: string) {
  return TAG_COLORS.find(c => c.value === value) ?? TAG_COLORS[TAG_COLORS.length - 1]
}

function linkCount(name: string) {
  return MOCK_LINKS.filter(l => l.tags.includes(name)).length
}

function ColorPicker({ selected, onChange }: { selected: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Color</span>
      {TAG_COLORS.map(c => (
        <button
          key={c.value}
          onClick={() => onChange(c.value)}
          aria-label={c.value}
          className={`h-5 w-5 rounded-full transition ${c.dot} ring-offset-2 ${
            selected === c.value ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-110'
          }`}
        />
      ))}
    </div>
  )
}

export default function TagList() {
  const [tags, setTags] = useState<Tag[]>(INITIAL_TAGS)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0].value)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  function openAdd() { setAdding(true); setEditingId(null); setDeletingId(null) }
  function closeAdd() { setAdding(false); setNewName(''); setNewColor(TAG_COLORS[0].value) }

  function addTag() {
    if (!newName.trim()) return
    setTags(prev => [...prev, { id: Date.now().toString(), name: newName.trim(), color: newColor }])
    closeAdd()
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
    setDeletingId(null)
    setAdding(false)
  }

  function saveEdit() {
    if (!editName.trim()) return
    setTags(prev => prev.map(t => t.id === editingId ? { ...t, name: editName.trim(), color: editColor } : t))
    setEditingId(null)
  }

  function confirmDelete(id: string) { setDeletingId(id); setEditingId(null); setAdding(false) }
  function deleteTag(id: string) { setTags(prev => prev.filter(t => t.id !== id)); setDeletingId(null) }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tags</h1>
          <p className="mt-0.5 text-sm text-slate-500">{tags.length} tag{tags.length !== 1 ? 's' : ''}</p>
        </div>
        {!adding && (
          <button
            onClick={openAdd}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            + New tag
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="mb-3 text-sm font-semibold text-slate-700">New tag</p>
          <input
            autoFocus
            type="text"
            placeholder="Tag name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') closeAdd() }}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <div className="mt-3">
            <ColorPicker selected={newColor} onChange={setNewColor} />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={closeAdd}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={addTag}
              disabled={!newName.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add tag
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tags.map(tag => {
          const color = colorFor(tag.color)
          const count = linkCount(tag.name)
          const isEditing = editingId === tag.id
          const isDeleting = deletingId === tag.id

          if (isEditing) {
            return (
              <div key={tag.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-200">
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                <div className="mt-3">
                  <ColorPicker selected={editColor} onChange={setEditColor} />
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
            <div key={tag.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${color.bg} ${color.text}`}>
                {tag.name}
              </span>
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
                      onClick={() => deleteTag(tag.id)}
                      className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(tag)}
                      aria-label="Edit tag"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => confirmDelete(tag.id)}
                      aria-label="Delete tag"
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

      {tags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">🏷️</div>
          <p className="text-slate-500">No tags yet. Create your first one.</p>
        </div>
      )}
    </main>
  )
}
