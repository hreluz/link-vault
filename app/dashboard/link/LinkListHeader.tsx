'use client'

import { useLinkListContext } from './LinkListContext'
import { RefreshIcon } from '@/components/icons'

export default function LinkListHeader() {
  const {
    totalCount, unreadCount, setModalOpen, favoritesOnly,
    refreshing, handleRefresh, selectedStatuses,
  } = useLinkListContext()
  // Only meaningful across all statuses -- any status filter already says what is (or isn't) unread.
  const showUnreadCount = selectedStatuses.length === 0

  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
          {favoritesOnly ? 'Favorites' : 'Your Links'}
        </h1>
        <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
          {totalCount} link{totalCount !== 1 ? 's' : ''}{showUnreadCount && ` (${unreadCount} unread)`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-busy={refreshing}
          aria-label="Refresh links"
          title="Refresh links"
          className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-surface-200 bg-surface-card px-2.5 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 sm:min-h-0 sm:min-w-0"
        >
          <RefreshIcon className={`h-5 w-5${refreshing ? ' animate-spin motion-reduce:animate-none' : ''}`} />
        </button>
        <button
          onClick={() => setModalOpen(true)}
          aria-label="Add link"
          title="Add link"
          className="focus-ring min-h-11 min-w-11 rounded-xl border border-transparent bg-primary-600 px-3 py-2 text-base font-semibold leading-5 text-white shadow-sm transition hover:bg-primary-500 sm:min-h-0 sm:min-w-10"
        >
          +
        </button>
      </div>
    </div>
  )
}
