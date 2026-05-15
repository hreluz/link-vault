'use client'

import { useState } from 'react'
import { MOCK_LINKS, type MockLink } from '@/lib/mock-data'
import type { LinkStatus } from '@/lib/types/database'
import LinkCard from '../link/LinkCard'
import BottomSheet from '../link/BottomSheet'

const FAVORITES = MOCK_LINKS.filter(l => l.is_favorite)

export default function FavoritesList() {
  const [activeLink, setActiveLink] = useState<MockLink | null>(null)
  const [statuses, setStatuses] = useState<Record<string, LinkStatus>>(
    () => Object.fromEntries(FAVORITES.map(l => [l.id, l.status]))
  )

  function handleStatusChange(id: string, status: LinkStatus) {
    setStatuses(prev => ({ ...prev, [id]: status }))
  }

  const links = FAVORITES.map(l => ({ ...l, status: statuses[l.id] }))

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {links.length} link{links.length !== 1 ? 's' : ''}
        </p>
      </div>

      {links.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(link => (
            <LinkCard key={link.id} link={link} onMenuOpen={() => setActiveLink(link)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">⭐</div>
          <p className="text-slate-500">No favorites yet. Star a link to see it here.</p>
        </div>
      )}

      <BottomSheet
        link={activeLink}
        currentStatus={activeLink ? statuses[activeLink.id] : 'unread'}
        onStatusChange={handleStatusChange}
        onClose={() => setActiveLink(null)}
      />
    </main>
  )
}
