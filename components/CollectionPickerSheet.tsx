'use client'

import type { LinkWithTags } from '@/lib/services/links'
import { COLLECTION_NAME_MAX } from '@/lib/services/collections'
import { useVault } from '@/lib/context/VaultContext'
import { useCollectionPicker, type MembershipChangeHandler } from '@/lib/hooks/collections/useCollectionPicker'
import LoadErrorMessage from '@/components/LoadErrorMessage'
import SheetShell from '@/components/SheetShell'

const ROW = 'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-600 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-surface-800 transition hover:bg-surface-50 dark:text-surface-100 dark:hover:bg-surface-800'

type Props = {
  link: LinkWithTags | null
  onClose: () => void
  onMembershipChange?: MembershipChangeHandler
  returnFocus?: () => HTMLElement | null
}

/** "Add to collection" from a card's ··· menu: type to find or create, every tick saves at once. */
export default function CollectionPickerSheet(props: Props) {
  // Mounted per link, so each open starts with a fresh query and membership snapshot.
  return props.link ? <PickerSheet key={props.link.id} {...props} link={props.link} /> : null
}

function PickerSheet({ link, onClose, onMembershipChange, returnFocus }: Props & { link: LinkWithTags }) {
  const { dek } = useVault()
  const picker = useCollectionPicker(link, dek, onMembershipChange)
  const inputDisabled = picker.loading || picker.loadError
  const trimmed = picker.query.trim()

  return (
    <SheetShell isOpen title="Add to collection" onClose={onClose} returnFocus={returnFocus}>
      <label className="block">
        <span className="sr-only">Search or create a collection</span>
        <input
          type="search"
          data-autofocus=""
          value={picker.query}
          onChange={e => picker.setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); picker.submitQuery() }
          }}
          placeholder="Search or create…"
          maxLength={COLLECTION_NAME_MAX}
          disabled={inputDisabled}
          className="w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
        />
      </label>

      <div className="mt-3">
        {picker.loading ? (
          <p role="status" className="py-6 text-center text-sm text-surface-500 dark:text-surface-400">Loading collections…</p>
        ) : picker.loadError ? (
          <LoadErrorMessage message="Couldn't load your collections." onRetry={picker.retry} className="py-6" />
        ) : (
          <>
            {picker.visibleCollections.length > 0 && (
              <ul className="space-y-1">
                {picker.visibleCollections.map(collection => (
                  <li key={collection.id}>
                    <label className={ROW}>
                      <input
                        type="checkbox"
                        checked={picker.memberIds.has(collection.id)}
                        onChange={() => picker.toggle(collection.id)}
                        className="h-4 w-4 shrink-0 accent-primary-600"
                      />
                      <span className="w-6 shrink-0 text-center text-lg" aria-hidden="true">{collection.emoji ?? ''}</span>
                      <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {picker.showCreate && (
              <button
                type="button"
                onClick={picker.createAndAdd}
                disabled={picker.creating}
                className="focus-ring mt-1 flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-primary-600 transition hover:bg-primary-50 disabled:opacity-60 dark:text-primary-400 dark:hover:bg-primary-900/20"
              >
                <span className="truncate">+ Create &ldquo;{trimmed}&rdquo;</span>
              </button>
            )}
            {picker.createError && (
              <p role="alert" className="mt-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {picker.createError}
              </p>
            )}
            {!trimmed && (
              <p className="px-1 pt-2 text-sm text-surface-500 dark:text-surface-400">
                {picker.hasNoCollections ? 'No collections yet. Type a name to create one.' : 'Type to find or create a collection.'}
              </p>
            )}
          </>
        )}
      </div>
    </SheetShell>
  )
}
