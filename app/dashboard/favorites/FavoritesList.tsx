'use client'

import { useState } from 'react'
import { useFavorites } from '@/lib/hooks/links'
import LinkCard from '../link/LinkCard'
import BottomSheet from '../link/BottomSheet'
import EditLinkModal from '../link/EditLinkModal'
import type { LinkWithTags } from '@/lib/services/links'

export default function FavoritesList() {
  const { links, loading, handleStatusChange, handleEdit, handleDelete, handleFavoriteToggle } = useFavorites()
  const [activeLink, setActiveLink] = useState<LinkWithTags | null>(null)
  const [editingLink, setEditingLink] = useState<LinkWithTags | null>(null)

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
        </div>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      </main>
    )
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
            <LinkCard
              key={link.id}
              link={link}
              onMenuOpen={() => setActiveLink(link)}
              onFavoriteToggle={() => handleFavoriteToggle(link.id)}
            />
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
        onSave={updated => { handleEdit(updated); setEditingLink(null) }}
        onClose={() => setEditingLink(null)}
      />

      <BottomSheet
        link={activeLink}
        onStatusChange={(id, status) => { handleStatusChange(id, status); setActiveLink(null) }}
        onFavoriteToggle={() => activeLink && handleFavoriteToggle(activeLink.id)}
        onEdit={() => setEditingLink(activeLink)}
        onDelete={() => { if (activeLink) handleDelete(activeLink.id); setActiveLink(null) }}
        onClose={() => setActiveLink(null)}
      />
    </main>
  )
}
