'use client'

import { useState } from 'react'
import { TagProvider, useTagContext } from './TagContext'
import { TagForm } from './TagForm'
import { TagRow } from './TagRow'
import { PrivateTagPasswordSection } from './PrivateTagPasswordSection'
import UnlockTagModal from '@/components/UnlockTagModal'
import ListSearchInput from '@/components/ListSearchInput'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { getPrivateTagIds, isTagVisible } from '@/lib/services/tags/tags'

function TagListContent() {
  const { tags, search, setSearch, adding, openAdd } = useTagContext()
  const { unlockedTagIds, unlockTag, lockAll } = useUnlockedTags()
  const [unlocking, setUnlocking] = useState(false)

  const hasPrivate = tags.some(t => t.is_private)
  const hasUnlocked = tags.some(t => t.is_private && unlockedTagIds.has(t.id))
  const visibleTags = tags.filter(t => isTagVisible(t.is_private, t.id, unlockedTagIds))
  const filteredTags = visibleTags.filter(t => t.name.toLowerCase().includes(search.trim().toLowerCase()))

  async function handleUnlock() {
    const ids = await getPrivateTagIds()
    ids.forEach(id => unlockTag(id))
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Tags</h1>
          <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{visibleTags.length} tag{visibleTags.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPrivate && !hasUnlocked && (
            <button
              onClick={() => setUnlocking(true)}
              title="Unlock all private tags"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {hasUnlocked && (
            <button
              onClick={lockAll}
              title="Lock all private tags"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600 transition hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M11 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H9V4.5a2 2 0 1 1 4 0 .75.75 0 0 0 1.5 0A3.5 3.5 0 0 0 11 1Z" />
              </svg>
            </button>
          )}
          {!adding && (
            <button
              onClick={openAdd}
              className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
            >
              + New tag
            </button>
          )}
        </div>
      </div>

      <PrivateTagPasswordSection />

      {visibleTags.length > 0 && (
        <ListSearchInput value={search} onChange={setSearch} placeholder="Search tags…" />
      )}

      {adding && <TagForm mode="add" />}

      <div className="space-y-2">
        {filteredTags.map(tag => (
          <TagRow key={tag.id} tag={tag} />
        ))}
      </div>

      {visibleTags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">🏷️</div>
          <p className="text-surface-500 dark:text-surface-400">
            {tags.length === 0 ? 'No tags yet. Create your first one.' : 'All tags are private. Unlock to view them.'}
          </p>
        </div>
      )}

      {visibleTags.length > 0 && filteredTags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">🔍</div>
          <p className="text-surface-500 dark:text-surface-400">No tags match &ldquo;{search}&rdquo;.</p>
        </div>
      )}

      {unlocking && (
        <UnlockTagModal
          onUnlock={handleUnlock}
          onClose={() => setUnlocking(false)}
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
