'use client'

import { useTagContext } from './TagContext'
import TagSuggestionsDropdown from '@/components/TagSuggestionsDropdown'
import type { TagWithCount } from '@/lib/services/tags'

interface Props {
  tag: TagWithCount
}

export function TagMergeForm({ tag }: Props) {
  const {
    mergeQuery, setMergeQuery, selectedIndex, suggestions, mergeTarget, mergeError, submitting,
    mergePreview, previewLoading,
    cancelMerging, selectSuggestion, cancelMerge, onKeyPress, confirmMerge,
  } = useTagContext()

  if (mergeTarget) {
    const sourceCount = mergePreview ? String(mergePreview.sourceCount) : previewLoading ? '…' : null
    const targetCount = mergePreview ? String(mergePreview.targetCount) : previewLoading ? '…' : null
    const totalAfterMerge = mergePreview ? String(mergePreview.totalAfterMerge) : previewLoading ? '…' : null
    const overlapCount = mergePreview
      ? mergePreview.sourceCount + mergePreview.targetCount - mergePreview.totalAfterMerge
      : null

    return (
      <div className="rounded-2xl bg-surface-card p-4 shadow-sm ring-1 ring-primary-200 dark:bg-surface-900 dark:ring-primary-700">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <p className="font-semibold">
            Merge &ldquo;{tag.name}&rdquo;{sourceCount !== null && ` (${sourceCount} link${sourceCount === '1' ? '' : 's'})`} into existing tag &ldquo;{mergeTarget.name}&rdquo;{targetCount !== null && ` (${targetCount} link${targetCount === '1' ? '' : 's'})`}?
          </p>
          <p className="mt-1.5">
            {totalAfterMerge !== null
              ? <>&ldquo;{mergeTarget.name}&rdquo; will have {totalAfterMerge} link{totalAfterMerge === '1' ? '' : 's'} after merging{overlapCount !== null && overlapCount > 0 && <> ({overlapCount} already had both tags)</>}. This can&rsquo;t be undone.</>
              : <>This moves all of &ldquo;{tag.name}&rdquo;&rsquo;s links into &ldquo;{mergeTarget.name}&rdquo; and deletes &ldquo;{tag.name}&rdquo;. This can&rsquo;t be undone.</>
            }
          </p>
        </div>
        {mergeError && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{mergeError}</p>
        )}
        <div className="mt-3 flex gap-2">
          <button
            onClick={cancelMerge}
            disabled={submitting}
            className="rounded-xl border border-surface-200 bg-surface-card px-3 py-1.5 text-xs font-medium text-surface-600 transition hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
          >
            Cancel
          </button>
          <button
            onClick={confirmMerge}
            disabled={submitting}
            className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Merging…' : 'Merge tags'}
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
      <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
        {tag.is_private
          ? <>Private tags can only merge into other private tags. To merge &ldquo;{tag.name}&rdquo; into a public tag, set it to public first (Edit tag), then try again.</>
          : <>This tag is public — it can only merge into other public tags. To merge &ldquo;{tag.name}&rdquo; into a private tag, set it to private first (Edit tag), then try again.</>
        }
      </p>
      {mergeError && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{mergeError}</p>
      )}
    </div>
  )
}
