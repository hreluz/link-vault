'use client'

import { useTagContext } from './TagContext'
import { TagForm } from './TagForm'
import { colorFor } from '@/components/ColorPicker'
import type { TagWithCount } from '@/lib/services/tags'

export function TagRow({ tag }: { tag: TagWithCount }) {
  const { editingId, deletingId, deleteError, startEdit, confirmDelete, deleteTag, setDeletingId, setDeleteError } = useTagContext()
  const color = colorFor(tag.color)
  const count = tag.link_count
  const isEditing = editingId === tag.id
  const isDeleting = deletingId === tag.id

  if (isEditing) return <TagForm mode="edit" />

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${color.bg} ${color.text}`}>
        {tag.name}
      </span>
      <span className="text-xs text-slate-400 dark:text-slate-500">{count} link{count !== 1 ? 's' : ''}</span>
      <div className="ml-auto flex items-center gap-1">
        {isDeleting ? (
          <>
            {deleteError ? (
              <span className="mr-1 text-xs text-red-600 dark:text-red-400">{deleteError}</span>
            ) : (
              <span className="mr-1 text-xs text-slate-500 dark:text-slate-400">Delete?</span>
            )}
            <button
              onClick={() => { setDeletingId(null); setDeleteError(null) }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {deleteError ? 'OK' : 'Cancel'}
            </button>
            {!deleteError && (
              <button
                onClick={() => deleteTag(tag.id)}
                className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                Delete
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => startEdit(tag)}
              aria-label="Edit tag"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              ✏️
            </button>
            <button
              onClick={() => confirmDelete(tag.id)}
              aria-label="Delete tag"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </div>
  )
}
