'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addLinksToCollection, createCollection, getCollectionIdsForLink, getCollections, removeLinkFromCollection,
  type Collection, type CollectionMembership,
} from '@/lib/services/collections'
import type { LinkWithTags } from '@/lib/services/links'
import { filterCollectionsByName, findCollectionByName } from '@/lib/utils/collectionSearch'
import { useToast } from '@/components/ToastProvider'
import { SAVE_ERROR } from './useCollectionAddForm'

export const PICKER_MATCH_LIMIT = 8

export type MembershipChangeHandler = (
  link: LinkWithTags, collectionId: string, isMember: boolean, membership?: CollectionMembership,
) => void

/**
 * The ··· sheet's "Add to collection": a search-or-create box over the user's
 * collections where every tick writes at once. With an empty query only the
 * link's collections show (a snapshot taken at open, plus ones created here), so
 * an untick can be ticked back; a typed query shows up to 8 name matches.
 * Mount it per open (CollectionPickerSheet is rendered only while a link is set),
 * so the query and snapshot start fresh each time.
 */
export function useCollectionPicker(
  link: LinkWithTags | null,
  dek: CryptoKey | null,
  onMembershipChange?: MembershipChangeHandler,
) {
  const { addToast } = useToast()
  const [collections, setCollections] = useState<Collection[]>([])
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())
  const [snapshotIds, setSnapshotIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [query, setQueryState] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const pendingRef = useRef(new Set<string>())
  const linkId = link?.id ?? null

  useEffect(() => {
    if (!linkId || !dek) return
    let cancelled = false
    Promise.all([getCollections(dek), getCollectionIdsForLink(linkId)])
      .then(([list, ids]) => {
        if (cancelled) return
        setCollections(list)
        setMemberIds(new Set(ids))
        setSnapshotIds(new Set(ids))
        setLoadError(false)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [linkId, dek, attempt])

  const retry = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    setAttempt(n => n + 1)
  }, [])

  function setQuery(value: string) {
    setQueryState(value)
    setCreateError(null)
  }

  const trimmed = query.trim()

  const visibleCollections = useMemo(
    () => trimmed
      ? filterCollectionsByName(collections, trimmed).slice(0, PICKER_MATCH_LIMIT)
      : collections.filter(c => snapshotIds.has(c.id)),
    [collections, snapshotIds, trimmed],
  )

  const showCreate = trimmed !== '' && !findCollectionByName(collections, trimmed)
  const hasNoCollections = collections.length === 0

  async function toggle(collectionId: string) {
    if (!link || pendingRef.current.has(collectionId)) return
    pendingRef.current.add(collectionId)
    const adding = !memberIds.has(collectionId)
    const flip = (on: boolean) => setMemberIds(prev => {
      const next = new Set(prev)
      if (on) next.add(collectionId)
      else next.delete(collectionId)
      return next
    })
    flip(adding)
    if (adding) {
      const inserted = await addLinksToCollection(collectionId, [link.id])
      if (inserted) onMembershipChange?.(link, collectionId, true, inserted[0])
      else { flip(false); addToast('Failed to update collection', 'destructive') }
    } else {
      const ok = await removeLinkFromCollection(collectionId, link.id)
      if (ok) onMembershipChange?.(link, collectionId, false)
      else { flip(true); addToast('Failed to update collection', 'destructive') }
    }
    pendingRef.current.delete(collectionId)
  }

  /** Creates a collection named after the query, adds the link to it, then clears the query. */
  async function createAndAdd() {
    if (!link || !dek || !trimmed || creating) return
    setCreating(true)
    setCreateError(null)
    const result = await createCollection({ name: trimmed }, dek)
    if (result.error) {
      setCreating(false)
      setCreateError(SAVE_ERROR)
      return
    }
    const created = result.data
    setCollections(prev => [created, ...prev])
    setSnapshotIds(prev => new Set(prev).add(created.id))
    setMemberIds(prev => new Set(prev).add(created.id))
    setQueryState('')
    setCreating(false)
    const inserted = await addLinksToCollection(created.id, [link.id])
    if (inserted) {
      onMembershipChange?.(link, created.id, true, inserted[0])
    } else {
      setMemberIds(prev => { const next = new Set(prev); next.delete(created.id); return next })
      addToast('Failed to update collection', 'destructive')
    }
  }

  /** Enter: an exact name match toggles it (the first, most recently updated); otherwise create. */
  function submitQuery() {
    if (!trimmed) return
    const exact = findCollectionByName(collections, trimmed)
    if (exact) toggle(exact.id)
    else createAndAdd()
  }

  return {
    loading, loadError, retry,
    query, setQuery, visibleCollections, memberIds, showCreate, hasNoCollections,
    toggle, createAndAdd, submitQuery, createError, creating,
  }
}
