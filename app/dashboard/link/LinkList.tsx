'use client'

import { LinkListProvider } from './LinkListContext'
import LinkListHeader from './LinkListHeader'
import FavoritesToggle from './FavoritesToggle'
import LinkSearchBar from './LinkSearchBar'
import StatusTabBar from './StatusTabBar'
import ActiveFilterChips from './ActiveFilterChips'
import LinkGrid from './LinkGrid'
import LinkModals from './LinkModals'
import HeaderUndoButton from './HeaderUndoButton'

export default function LinkList({
  autoFetchDefault,
  moveToEndDelaySeconds,
}: {
  autoFetchDefault?: boolean
  moveToEndDelaySeconds?: number
}) {
  return (
    <LinkListProvider autoFetchDefault={autoFetchDefault} moveToEndDelaySeconds={moveToEndDelaySeconds}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <LinkListHeader />
        <HeaderUndoButton />
        <FavoritesToggle />
        <LinkSearchBar />
        <StatusTabBar />
        <ActiveFilterChips />
        <LinkGrid />
        <LinkModals />
      </main>
    </LinkListProvider>
  )
}
