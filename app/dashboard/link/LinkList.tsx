'use client'

import { LinkListProvider } from './LinkListContext'
import LinkListHeader from './LinkListHeader'
import LinkSearchBar from './LinkSearchBar'
import ActiveFilterChips from './ActiveFilterChips'
import LinkGrid from './LinkGrid'
import LinkModals from './LinkModals'

export default function LinkList() {
  return (
    <LinkListProvider>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <LinkListHeader />
        <LinkSearchBar />
        <ActiveFilterChips />
        <LinkGrid />
        <LinkModals />
      </main>
    </LinkListProvider>
  )
}
