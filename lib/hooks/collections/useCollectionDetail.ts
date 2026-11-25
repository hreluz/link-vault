'use client'

import { useVault } from '@/lib/context/VaultContext'
import type { LinkWithTags } from '@/lib/services/links'
import type { CollectionMembership } from '@/lib/services/collections'
import { useCollectionLinks, type CollectionLinkRow } from './useCollectionLinks'
import { useCollectionLinkActions } from './useCollectionLinkActions'
import { useCollectionOrder } from './useCollectionOrder'
import { useCollectionEditForm } from './useCollectionEditForm'
import { useCollectionDeleteFlow } from './useCollectionDeleteFlow'
import { useCollectionSearch } from './useCollectionSearch'

/** Play next: the first visible row, in collection order, still `unread` or `watching`. */
export function findPlayNext(visibleRows: CollectionLinkRow[]): CollectionLinkRow | null {
  return visibleRows.find(row => row.link.status === 'unread' || row.link.status === 'watching') ?? null
}

/** The collection page: data, card actions, order, edit/delete of the collection, search, and Play next. */
export function useCollectionDetail(collectionId: string) {
  const { dek } = useVault()
  const data = useCollectionLinks(collectionId, dek)
  const actions = useCollectionLinkActions(collectionId, data.rows, data.setRows)
  const order = useCollectionOrder(collectionId, data.collection?.name ?? '', data.rows, data.visibleRows, data.setRows)
  const editForm = useCollectionEditForm(data.collection, data.setCollection, dek)
  const deleteFlow = useCollectionDeleteFlow(data.collection)
  const search = useCollectionSearch(data.visibleRows)

  const playNextRow = findPlayNext(data.visibleRows)

  /** Opens the next link like a card click would (Unread → Watching, Last opened). Returns its id. */
  function playNext(): string | null {
    if (!playNextRow) return null
    const { link } = playNextRow
    window.open(link.url, '_blank', 'noopener,noreferrer')
    actions.handleLinkOpen(link.id, link.status)
    return link.id
  }

  // Links just added would otherwise be hidden by the current search.
  async function appendLinks(links: LinkWithTags[]): Promise<CollectionMembership[] | null> {
    const inserted = await actions.appendLinks(links)
    if (inserted) search.clearSearch()
    return inserted
  }

  // Editing the collection and confirming its delete are mutually exclusive.
  function startEdit() {
    deleteFlow.cancelDelete()
    editForm.startEdit()
  }

  function askDelete() {
    editForm.cancelEdit()
    deleteFlow.askDelete()
  }

  return {
    ...data,
    ...actions,
    appendLinks,
    order,
    search,
    editForm: { ...editForm, startEdit },
    deleteFlow: { ...deleteFlow, askDelete },
    playNextRow, playNext,
  }
}
