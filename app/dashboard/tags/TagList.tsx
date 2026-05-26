'use client'

import { TagProvider, useTagContext } from './TagContext'
import { TagForm } from './TagForm'
import { TagRow } from './TagRow'

function TagListContent() {
  const { tags, adding, openAdd } = useTagContext()

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

      {adding && <TagForm mode="add" />}

      <div className="space-y-2">
        {tags.map(tag => <TagRow key={tag.id} tag={tag} />)}
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

export default function TagList() {
  return (
    <TagProvider>
      <TagListContent />
    </TagProvider>
  )
}
