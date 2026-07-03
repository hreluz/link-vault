'use client'

import { LinkListProvider } from './LinkListContext'
import LinkListHeader from './LinkListHeader'
import FavoritesToggle from './FavoritesToggle'
import LinkSearchBar from './LinkSearchBar'
import StatusTabBar from './StatusTabBar'
import ActiveFilterChips from './ActiveFilterChips'
import BulkActionToolbar from './BulkActionToolbar'
import LinkGrid from './LinkGrid'
import LinkModals from './LinkModals'

export default function LinkList() {
  return (
    <LinkListProvider>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <LinkListHeader />
        <FavoritesToggle />
        <LinkSearchBar />
        <StatusTabBar />
        <ActiveFilterChips />
        <BulkActionToolbar />
        <LinkGrid />
        <LinkModals />
      </main>
    </LinkListProvider>
  )
}
