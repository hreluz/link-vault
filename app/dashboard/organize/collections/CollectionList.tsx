'use client'

import { useRef } from 'react'
import { useCollections } from '@/lib/hooks/collections/useCollections'
import { descriptionMatches } from '@/lib/utils/collectionSearch'
import { PlusIcon } from '@/components/icons'
import LoadErrorMessage from '@/components/LoadErrorMessage'
import SearchBar from '@/components/SearchBar'
import SearchNoMatch from '@/components/SearchNoMatch'
import SearchResultCount from '@/components/SearchResultCount'
import SkeletonRows from '@/components/SkeletonRows'
import CollectionForm from './CollectionForm'
import CollectionRow from './CollectionRow'

export default function CollectionList() {
  const {
    collections, loading, loadError, retry,
    adding, addError, saving, newName, setNewName, newEmoji, setNewEmoji, newDescription, setNewDescription,
    openAdd, closeAdd, handleAdd,
    query, setQuery, filteredCollections, isSearching, clearSearch,
  } = useCollections()
  const searchRef = useRef<HTMLDivElement>(null)

  const canAdd = !loading && !loadError && !adding
  const showSearch = !loading && !loadError && collections.length > 0

  function clearAndFocus() {
    clearSearch()
    searchRef.current?.querySelector('input')?.focus()
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Collections</h1>
          {!loading && !loadError && (
            <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
              {collections.length} collection{collections.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={openAdd}
            aria-label="New collection"
            className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
          >
            <PlusIcon className="h-4 w-4" />
            New
          </button>
        )}
      </div>

      {showSearch && (
        <div ref={searchRef}>
          <SearchBar value={query} onChange={setQuery} label="Search collections" placeholder="Search collections" />
          <SearchResultCount shown={filteredCollections.length} total={collections.length} noun="collection" active={isSearching} />
        </div>
      )}

      {adding && (
        <CollectionForm
          title="New collection"
          name={newName} onNameChange={setNewName}
          emoji={newEmoji} onEmojiChange={setNewEmoji}
          description={newDescription} onDescriptionChange={setNewDescription}
          error={addError} saving={saving}
          submitLabel="Add collection"
          onSubmit={handleAdd} onCancel={closeAdd}
        />
      )}

      {loading ? (
        <SkeletonRows count={4} variant="row" label="Loading collections…" />
      ) : loadError ? (
        <LoadErrorMessage message="Couldn't load your collections." onRetry={retry} className="py-20" />
      ) : collections.length === 0 ? (
        !adding && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-4xl" aria-hidden="true">📚</div>
            <p className="text-surface-500 dark:text-surface-400">No collections yet.</p>
            <button
              type="button"
              onClick={openAdd}
              className="focus-ring mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
            >
              <PlusIcon className="h-4 w-4" />
              New collection
            </button>
          </div>
        )
      ) : filteredCollections.length === 0 ? (
        <SearchNoMatch message={`No collections match "${query.trim()}".`} onClear={clearAndFocus} />
      ) : (
        <div className="space-y-2">
          {filteredCollections.map(collection => (
            <CollectionRow
              key={collection.id}
              collection={collection}
              showDescription={isSearching && descriptionMatches(collection.description, query)}
            />
          ))}
        </div>
      )}
    </main>
  )
}
