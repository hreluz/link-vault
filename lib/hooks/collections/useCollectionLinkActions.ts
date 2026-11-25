'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { deleteLink, toggleLinkFavorite, updateLinkStatus, type LinkWithTags } from '@/lib/services/links'
import { addLinksToCollection, type CollectionMembership } from '@/lib/services/collections'
import type { LinkStatus } from '@/lib/types/database'
import { STATUS_CONFIG } from '@/app/dashboard/config'
import { useToast } from '@/components/ToastProvider'
import { useTagsContext } from '@/lib/context/TagsContext'
import type { CollectionLinkRow } from './useCollectionLinks'

const DELETE_DELAY_MS = 2000

/**
 * Card behaviour on the collection page, like /dashboard minus move-to-end:
 * open (Unread → Watching, Last opened), status, favorite, edit, soft delete with
 * undo. A deleted link keeps its row (marked deleted_at) so Undo and a later
 * Trash restore bring it back in its place.
 */
export function useCollectionLinkActions(
  collectionId: string,
  rows: CollectionLinkRow[],
  setRows: Dispatch<SetStateAction<CollectionLinkRow[]>>,
) {
  const { addToast, dismissToast } = useToast()
  const { refetchTags } = useTagsContext()
  const [lastOpenedId, setLastOpenedId] = useState<string | null>(null)
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null)
  const [editingLink, setEditingLink] = useState<LinkWithTags | null>(null)
  const [pickerLink, setPickerLink] = useState<LinkWithTags | null>(null)

  const linkOf = (id: string) => rows.find(row => row.link.id === id)?.link
  const activeLink = activeLinkId ? linkOf(activeLinkId) ?? null : null

  function patchLink(id: string, patch: Partial<LinkWithTags>) {
    setRows(prev => prev.map(row => row.link.id === id ? { ...row, link: { ...row.link, ...patch } } : row))
  }

  async function handleStatusChange(id: string, status: LinkStatus) {
    const previous = linkOf(id)
    patchLink(id, { status })
    addToast(`Moved to ${STATUS_CONFIG[status].label}`)
    const ok = await updateLinkStatus(id, status)
    if (!ok && previous) {
      patchLink(id, { status: previous.status })
      addToast('Failed to update status', 'destructive')
    }
  }

  function handleLinkOpen(id: string, currentStatus: LinkStatus) {
    setLastOpenedId(id)
    if (currentStatus === 'unread') handleStatusChange(id, 'watching')
  }

  async function handleFavoriteToggle(id: string) {
    const wasFavorite = !!linkOf(id)?.is_favorite
    patchLink(id, { is_favorite: !wasFavorite })
    const ok = await toggleLinkFavorite(id, !wasFavorite)
    if (!ok) {
      patchLink(id, { is_favorite: wasFavorite })
      addToast('Failed to update favorite', 'destructive')
    } else {
      addToast(wasFavorite ? 'Removed from favorites' : 'Added to favorites')
    }
  }

  /** After the Edit modal saves. `collectionIds` is the link's collections after the save (null if unchanged/unknown). */
  function handleEdit(updated: LinkWithTags, collectionIds: string[] | null) {
    if (collectionIds && !collectionIds.includes(collectionId)) {
      removeRowLocally(updated.id)
    } else {
      setRows(prev => prev.map(row => row.link.id === updated.id ? { ...row, link: updated } : row))
    }
    setEditingLink(null)
    refetchTags()
  }

  function handleDelete(id: string) {
    const link = linkOf(id)
    if (!link) return
    if (link.is_favorite) {
      addToast('Unfavorite to delete', 'destructive')
      return
    }
    const deletedAt = new Date().toISOString()
    patchLink(id, { deleted_at: deletedAt })
    let cancelled = false
    const toastId = addToast('Link deleted, tap to undo', 'destructive', {
      duration: 3000,
      onClick: () => {
        cancelled = true
        patchLink(id, { deleted_at: null })
        dismissToast(toastId)
      },
    })
    setTimeout(async () => {
      if (cancelled) return
      const result = await deleteLink(id)
      if (result === 'blocked') {
        patchLink(id, { deleted_at: null })
        addToast('Unfavorite to delete', 'destructive')
      } else if (result === 'error') {
        patchLink(id, { deleted_at: null })
        addToast('Failed to delete link', 'destructive')
      }
    }, DELETE_DELAY_MS)
  }

  function removeRowLocally(linkId: string) {
    setRows(prev => prev.filter(row => row.link.id !== linkId))
  }

  /** The ··· picker ticked or unticked a collection for one of this page's links. */
  function handleMembershipChange(link: LinkWithTags, changedCollectionId: string, isMember: boolean, membership?: CollectionMembership) {
    if (changedCollectionId !== collectionId) return
    if (!isMember) {
      removeRowLocally(link.id)
      return
    }
    if (membership) {
      setRows(prev => prev.some(row => row.link.id === link.id) ? prev : [...prev, { membership, link }])
    }
  }

  /** Appends links to this collection and shows them at the bottom right away. null on failure. */
  async function appendLinks(links: LinkWithTags[]): Promise<CollectionMembership[] | null> {
    const inserted = await addLinksToCollection(collectionId, links.map(link => link.id))
    if (!inserted) return null
    const linkById = new Map(links.map(link => [link.id, link]))
    setRows(prev => [
      ...prev,
      ...inserted.flatMap(membership => {
        const link = linkById.get(membership.link_id)
        return link ? [{ membership, link }] : []
      }),
    ])
    return inserted
  }

  return {
    lastOpenedId, setLastOpenedId,
    activeLink, setActiveLinkId,
    editingLink, setEditingLink,
    pickerLink, setPickerLink,
    handleLinkOpen, handleStatusChange, handleFavoriteToggle, handleEdit, handleDelete,
    handleMembershipChange, removeRowLocally, appendLinks,
  }
}
