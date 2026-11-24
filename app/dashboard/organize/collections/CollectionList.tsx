'use client'

import { useCollections } from '@/lib/hooks/collections/useCollections'
import LoadErrorMessage from '@/components/LoadErrorMessage'
import CollectionForm from './CollectionForm'
import CollectionRow from './CollectionRow'

export default function CollectionList() {
  const {
    collections, loading, loadError, retry,
    adding, addError, saving, newName, setNewName, newEmoji, setNewEmoji, newDescription, setNewDescription,
    openAdd, closeAdd, handleAdd,
  } = useCollections()

  const canAdd = !loading && !loadError && !adding

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
            className="focus-ring min-h-11 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
          >
            + New
          </button>
        )}
      </div>

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
        <p role="status" className="py-20 text-center text-sm text-surface-500 dark:text-surface-400">Loading collections…</p>
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
              className="focus-ring mt-4 min-h-11 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500"
            >
              New collection
            </button>
          </div>
        )
      ) : (
        <div className="space-y-2">
          {collections.map(collection => <CollectionRow key={collection.id} collection={collection} />)}
        </div>
      )}
    </main>
  )
}
