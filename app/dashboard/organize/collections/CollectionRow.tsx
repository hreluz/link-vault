import Link from 'next/link'
import { formatCollectionCount, type CollectionWithCounts } from '@/lib/services/collections'

type Props = {
  collection: CollectionWithCounts
  /** Show the description as one muted line under the name (while searching, on a description match). */
  showDescription?: boolean
}

export default function CollectionRow({ collection, showDescription = false }: Props) {
  return (
    <Link
      href={`/dashboard/organize/collections/${collection.id}`}
      className="focus-ring flex min-h-11 items-center gap-3 rounded-2xl bg-surface-card px-4 py-3.5 shadow-sm ring-1 ring-surface-200 transition hover:shadow-md hover:ring-surface-300 dark:bg-surface-900 dark:ring-surface-700 dark:hover:ring-surface-600"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center text-xl" aria-hidden="true">
        {collection.emoji ?? ''}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-surface-900 dark:text-surface-100">{collection.name}</span>
        {showDescription && collection.description && (
          <span data-testid="collection-description" className="block truncate text-xs text-surface-500 dark:text-surface-400">
            {collection.description}
          </span>
        )}
        <span className="block text-xs text-surface-500 dark:text-surface-400">
          {formatCollectionCount(collection.link_count, collection.done_count)}
        </span>
      </span>
      <span className="text-lg text-surface-400 dark:text-surface-500" aria-hidden="true">›</span>
    </Link>
  )
}
