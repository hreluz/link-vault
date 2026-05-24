'use client'

import { useState } from 'react'
import { MOCK_LINKS, type MockLink } from '@/lib/mock-data'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '../config'
import LinkCard from '../link/LinkCard'
import BottomSheet from '../link/BottomSheet'
import EditLinkModal from '../link/EditLinkModal'
import { useToast } from '@/components/ToastProvider'

export default function FavoritesList() {
  const [links, setLinks] = useState<MockLink[]>(MOCK_LINKS.filter(l => l.is_favorite))
  const [activeLink, setActiveLink] = useState<MockLink | null>(null)
  const [editingLink, setEditingLink] = useState<MockLink | null>(null)
  const { addToast } = useToast()

  function handleStatusChange(id: string, status: LinkStatus) {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    setActiveLink(prev => prev?.id === id ? { ...prev, status } : prev)
    addToast(`Moved to ${STATUS_CONFIG[status].label}`)
  }

  function handleEdit(updated: MockLink) {
    setLinks(prev => prev.map(l => l.id === updated.id ? updated : l))
    setEditingLink(null)
    addToast('Changes saved')
  }

  function handleDelete() {
    if (!activeLink) return
    setLinks(prev => prev.filter(l => l.id !== activeLink.id))
    setActiveLink(null)
    addToast('Link deleted', 'destructive')
  }

  function handleFavoriteToggle(id: string) {
    setLinks(prev => prev.filter(l => l.id !== id))
    setActiveLink(null)
    addToast('Removed from favorites')
  }

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
            <LinkCard key={link.id} link={link} onMenuOpen={() => setActiveLink(link)} onFavoriteToggle={() => handleFavoriteToggle(link.id)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-4xl" aria-hidden="true">⭐</div>
          <p className="text-slate-500">No favorites yet. Star a link to see it here.</p>
        </div>
      )}

      <EditLinkModal
        key={editingLink?.id}
        link={editingLink}
        onSave={handleEdit}
        onClose={() => setEditingLink(null)}
      />

      <BottomSheet
        link={activeLink}
        onStatusChange={handleStatusChange}
        onFavoriteToggle={() => activeLink && handleFavoriteToggle(activeLink.id)}
        onEdit={() => setEditingLink(activeLink)}
        onDelete={handleDelete}
        onClose={() => setActiveLink(null)}
      />
    </main>
  )
}
