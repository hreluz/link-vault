'use client'

import { useTagContext } from './TagContext'
import TagSuggestionsDropdown from '@/components/TagSuggestionsDropdown'
import type { TagWithCount } from '@/lib/services/tags'

interface Props {
  tag: TagWithCount
}

export function TagMergeForm({ tag }: Props) {
  const {
    mergeQuery, setMergeQuery, selectedIndex, suggestions, mergeTarget, mergeError,
    cancelMerging, selectSuggestion, cancelMerge, onKeyPress, confirmMerge,
  } = useTagContext()

  if (mergeTarget) {
    return (
      <div className="rounded-2xl bg-surface-card p-4 shadow-sm ring-1 ring-primary-200 dark:bg-surface-900 dark:ring-primary-700">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <p className="font-semibold">
            Merge &ldquo;{tag.name}&rdquo; into existing tag &ldquo;{mergeTarget.name}&rdquo;?
          </p>
          <p className="mt-1.5">
            This moves all of &ldquo;{tag.name}&rdquo;&rsquo;s links into &ldquo;{mergeTarget.name}&rdquo; and deletes &ldquo;{tag.name}&rdquo;. This can&rsquo;t be undone.
          </p>
        </div>
        {mergeError && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{mergeError}</p>
        )}
        <div className="mt-3 flex gap-2">
          <button
            onClick={cancelMerge}
            className="rounded-xl border border-surface-200 bg-surface-card px-3 py-1.5 text-xs font-medium text-surface-600 transition hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
          >
            Cancel
          </button>
          <button
            onClick={confirmMerge}
            className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-500"
          >
            Merge tags
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface-card p-4 shadow-sm ring-1 ring-primary-200 dark:bg-surface-900 dark:ring-primary-700">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">
          Merge &ldquo;{tag.name}&rdquo; into…
        </p>
        <button
          onClick={cancelMerging}
          className="rounded-xl border border-surface-200 bg-surface-card px-3 py-1.5 text-xs font-medium text-surface-600 transition hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
        >
          Cancel
        </button>
      </div>
      <div className="relative">
        <input
          autoFocus
          type="text"
          placeholder="Type a tag name…"
          value={mergeQuery}
          onChange={e => setMergeQuery(e.target.value.toLowerCase())}
          onKeyDown={e => { if (onKeyPress(e.key)) e.preventDefault() }}
          className="w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-2.5 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
        />
        <TagSuggestionsDropdown suggestions={suggestions.map(t => t.name)} selectedIndex={selectedIndex} onSelect={name => {
          const match = suggestions.find(t => t.name === name)
          if (match) selectSuggestion(match)
        }} />
      </div>
      {mergeError && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{mergeError}</p>
      )}
    </div>
  )
}
