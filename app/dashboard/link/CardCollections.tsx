'use client'

import Link from 'next/link'
import type { CardCollection } from '@/lib/services/collections'
import { FolderIcon } from '@/components/icons'

/** Chips shown before the "+N" button (SPEC 46). */
export const VISIBLE_COLLECTION_CHIPS = 2

interface Props {
  linkId: string
  /** Already sorted: most recently added first. */
  collections: CardCollection[]
  onShowAll?: () => void
}

// relative z-10 lifts each control above the card's stretched title link, so a
// tap on a chip opens the collection, not the link.
const CHIP_BASE =
  'focus-ring relative z-10 inline-flex min-h-11 max-w-[11rem] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition sm:min-h-9'
const CHIP =
  `${CHIP_BASE} border-surface-300 bg-surface-card text-surface-700 hover:bg-surface-50 hover:text-surface-900 dark:border-surface-600 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-surface-100`
const MORE =
  `${CHIP_BASE} border-dashed border-surface-300 bg-surface-50 text-surface-600 hover:text-surface-900 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300 dark:hover:text-surface-100`

/** A dashboard card's collections: up to 2 chips linking to each collection, then "+N". */
export default function CardCollections({ linkId, collections, onShowAll }: Props) {
  if (collections.length === 0) return null
  const shown = collections.slice(0, VISIBLE_COLLECTION_CHIPS)
  const hidden = collections.length - shown.length

  return (
    <div data-testid="card-collections" className="flex flex-wrap items-center gap-1.5">
      {shown.map(collection => (
        <Link
          key={collection.id}
          href={`/dashboard/organize/collections/${collection.id}`}
          aria-label={`Open collection ${collection.name}`}
          title={collection.name}
          className={CHIP}
        >
          {collection.emoji
            ? <span aria-hidden="true" className="shrink-0">{collection.emoji}</span>
            : <FolderIcon className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{collection.name}</span>
        </Link>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={onShowAll}
          aria-label={`Show all ${collections.length} collections`}
          aria-haspopup="dialog"
          data-collections-more={linkId}
          className={MORE}
        >
          +{hidden}
        </button>
      )}
    </div>
  )
}
