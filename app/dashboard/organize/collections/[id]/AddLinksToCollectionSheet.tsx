'use client'

import type { LinkWithTags } from '@/lib/services/links'
import type { CollectionMembership } from '@/lib/services/collections'
import { useVault } from '@/lib/context/VaultContext'
import { useToast } from '@/components/ToastProvider'
import { useAddLinksToCollection, ADD_LINKS_RESULT_LIMIT } from '@/lib/hooks/collections/useAddLinksToCollection'
import { displayTitle } from '@/lib/utils/urlTitle'
import LoadErrorMessage from '@/components/LoadErrorMessage'
import SheetShell from '@/components/SheetShell'

type Props = {
  isOpen: boolean
  collectionName: string
  existingIds: Set<string>
  onAdd: (links: LinkWithTags[]) => Promise<CollectionMembership[] | null>
  /** After a saved add, with the links in the order they were added. */
  onAdded: (links: LinkWithTags[]) => void
  onClose: () => void
}

export default function AddLinksToCollectionSheet(props: Props) {
  // Mounted only while open, so each open starts with no query and no ticks.
  return props.isOpen ? <AddLinksSheet {...props} /> : null
}

function AddLinksSheet({ isOpen, collectionName, existingIds, onAdd, onAdded, onClose }: Props) {
  const { dek } = useVault()
  const { addToast } = useToast()
  const sheet = useAddLinksToCollection({ isOpen, dek, existingIds, onAdd })
  const count = sheet.tickedIds.length

  async function handleAdd() {
    const added = await sheet.submit()
    if (!added) {
      addToast('Failed to add links', 'destructive')
      return
    }
    addToast(`Added ${added.length} ${added.length === 1 ? 'link' : 'links'} to ${collectionName}`)
    onClose()
    onAdded(added)
  }

  const footer = (
    <button
      type="button"
      onClick={handleAdd}
      disabled={count === 0 || sheet.adding}
      className="focus-ring min-h-11 w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      Add {count} {count === 1 ? 'link' : 'links'}
    </button>
  )

  return (
    <SheetShell isOpen={isOpen} title={`Add links to ${collectionName}`} onClose={onClose} footer={footer}>
      <label className="block">
        <span className="sr-only">Search links</span>
        <input
          type="search"
          data-autofocus=""
          value={sheet.query}
          onChange={e => sheet.setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
          placeholder="Search or #tag"
          disabled={sheet.loading || sheet.loadError}
          className="w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
        />
      </label>

      <div className="mt-3">
        {sheet.loading ? (
          <p role="status" className="py-6 text-center text-sm text-surface-500 dark:text-surface-400">Loading links…</p>
        ) : sheet.loadError ? (
          <LoadErrorMessage message="Couldn't load your links." onRetry={sheet.retry} className="py-6" />
        ) : !sheet.hasQuery ? (
          <p className="px-1 pt-1 text-sm text-surface-500 dark:text-surface-400">Type to find links.</p>
        ) : sheet.results.length === 0 ? (
          <p className="px-1 pt-1 text-sm text-surface-500 dark:text-surface-400">No links match &ldquo;{sheet.searchedQuery}&rdquo;.</p>
        ) : (
          <>
            <ul className="space-y-1">
              {sheet.results.map(link => {
                const already = existingIds.has(link.id)
                return (
                  <li key={link.id}>
                    <label className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-600 ${
                      already ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800'
                    }`}>
                      <input
                        type="checkbox"
                        checked={already || sheet.tickedIds.includes(link.id)}
                        disabled={already}
                        onChange={() => sheet.toggleTick(link.id)}
                        className="h-4 w-4 shrink-0 accent-primary-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-surface-800 dark:text-surface-100">{displayTitle(link)}</span>
                        <span className="block truncate text-xs text-surface-500 dark:text-surface-400">{link.site_name}</span>
                      </span>
                      {already && <span className="shrink-0 text-xs font-medium text-surface-500 dark:text-surface-400">Already in</span>}
                    </label>
                  </li>
                )
              })}
            </ul>
            {sheet.totalMatches > ADD_LINKS_RESULT_LIMIT && (
              <p className="px-1 pt-3 text-xs text-surface-500 dark:text-surface-400">
                Showing {ADD_LINKS_RESULT_LIMIT} of {sheet.totalMatches}. Type more to narrow it down.
              </p>
            )}
          </>
        )}
      </div>
    </SheetShell>
  )
}
