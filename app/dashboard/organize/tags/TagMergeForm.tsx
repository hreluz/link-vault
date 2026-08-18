'use client'

import { useTagContext } from './TagContext'
import TagSuggestionsDropdown from '@/components/TagSuggestionsDropdown'
import type { TagWithCount } from '@/lib/services/tags/tags'

interface Props {
  tag: TagWithCount
}

function formatLinkCount(n: number | null, loading: boolean): string | null {
  if (n !== null) return `${n} link${n === 1 ? '' : 's'}`
  return loading ? '… links' : null
}

function MergeError({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{message}</p>
}

function MergeConfirmStep({ tag }: Props) {
  const { mergeTarget, mergeError, submitting, mergePreview, previewLoading, cancelMerge, confirmMerge } = useTagContext()
  if (!mergeTarget) return null

  const sourceLabel = formatLinkCount(mergePreview?.sourceCount ?? null, previewLoading)
  const targetLabel = formatLinkCount(mergePreview?.targetCount ?? null, previewLoading)
  const totalLabel = formatLinkCount(mergePreview?.totalAfterMerge ?? null, previewLoading)
  const overlapCount = mergePreview
    ? mergePreview.sourceCount + mergePreview.targetCount - mergePreview.totalAfterMerge
    : null

  return (
    <>
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        <p className="font-semibold">
          Merge &ldquo;{tag.name}&rdquo;{sourceLabel && ` (${sourceLabel})`} into existing tag &ldquo;{mergeTarget.name}&rdquo;{targetLabel && ` (${targetLabel})`}?
        </p>
        <p className="mt-1.5">
          {totalLabel !== null
            ? <>&ldquo;{mergeTarget.name}&rdquo; will have {totalLabel} after merging{overlapCount !== null && overlapCount > 0 && <> ({overlapCount} already had both tags)</>}. This can&rsquo;t be undone.</>
            : <>This moves all of &ldquo;{tag.name}&rdquo;&rsquo;s links into &ldquo;{mergeTarget.name}&rdquo; and deletes &ldquo;{tag.name}&rdquo;. This can&rsquo;t be undone.</>
          }
        </p>
      </div>
      <MergeError message={mergeError} />
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
    </>
  )
}

function MergeSelectStep({ tag }: Props) {
  const { mergeQuery, setMergeQuery, selectedIndex, suggestions, mergeError, cancelMerging, selectSuggestion, onKeyPress } = useTagContext()

  return (
    <>
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
      <p className="mb-2 text-xs text-surface-500 dark:text-surface-400">
        {tag.is_private
          ? <>Private tags can only merge into other private tags. To merge &ldquo;{tag.name}&rdquo; into a public tag, set it to public first (Edit tag), then try again.</>
          : <>This tag is public — it can only merge into other public tags. To merge &ldquo;{tag.name}&rdquo; into a private tag, set it to private first (Edit tag), then try again.</>
        }
      </p>
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
      <MergeError message={mergeError} />
    </>
  )
}

export function TagMergeForm({ tag }: Props) {
  const { mergeTarget } = useTagContext()

  return (
    <div className="rounded-2xl bg-surface-card p-4 shadow-sm ring-1 ring-primary-200 dark:bg-surface-900 dark:ring-primary-700">
      {mergeTarget ? <MergeConfirmStep tag={tag} /> : <MergeSelectStep tag={tag} />}
    </div>
  )
}
