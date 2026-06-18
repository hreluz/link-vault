'use client'

import { useState } from 'react'
import { TagProvider, useTagContext } from './TagContext'
import { TagForm } from './TagForm'
import { TagRow } from './TagRow'
import UnlockTagModal from '@/components/UnlockTagModal'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'

function TagListContent() {
  const { tags, adding, openAdd } = useTagContext()
  const { unlockedTagNames, unlockTag, lockAll } = useUnlockedTags()
  const [unlockingTag, setUnlockingTag] = useState<string | null>(null)

  const hasUnlocked = tags.some(t => t.is_private && unlockedTagNames.has(t.name))

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Tags</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{tags.length} tag{tags.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnlocked && (
            <button
              onClick={lockAll}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Lock all
            </button>
          )}
          {!adding && (
            <button
              onClick={openAdd}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              + New tag
            </button>
          )}
        </div>
      </div>

      {adding && <TagForm mode="add" />}

      <div className="space-y-2">
        {tags.map(tag => (
          <TagRow key={tag.id} tag={tag} onUnlockRequest={setUnlockingTag} />
        ))}
      </div>

      {tags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">🏷️</div>
          <p className="text-slate-500 dark:text-slate-400">No tags yet. Create your first one.</p>
        </div>
      )}

      {unlockingTag && (
        <UnlockTagModal
          tagName={unlockingTag}
          onUnlock={() => unlockTag(unlockingTag)}
          onClose={() => setUnlockingTag(null)}
        />
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
