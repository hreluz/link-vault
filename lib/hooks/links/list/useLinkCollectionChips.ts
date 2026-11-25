'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCollections, getMembershipsForLinks,
  type CardCollection, type Collection, type CollectionMembership, type LinkCollectionRef,
} from '@/lib/services/collections'

/** Most recently added first; ties by name, A→Z. */
function compareRefs(a: LinkCollectionRef, b: LinkCollectionRef, byId: Map<string, Collection>): number {
  const byAdded = Date.parse(b.added_at) - Date.parse(a.added_at)
  if (byAdded !== 0) return byAdded
  return (byId.get(a.collection_id)?.name ?? '').localeCompare(byId.get(b.collection_id)?.name ?? '')
}

/**
 * The collections of every link the dashboard holds, for the card chips (SPEC 46).
 * Memberships are fetched once per link id (in batches, only for ids not seen yet),
 * and the user's collections once per load; `refreshKey` and a vault key change
 * start over. A generation counter drops responses from before that restart.
 * A failed load shows no chips and no message.
 */
export function useLinkCollectionChips(linkIds: string[], dek: CryptoKey | null, refreshKey: number) {
  const [collectionsById, setCollectionsById] = useState<Map<string, Collection>>(new Map())
  const [refsByLink, setRefsByLink] = useState<Map<string, LinkCollectionRef[]>>(new Map())
  const [failed, setFailed] = useState(false)
  // Ids already requested this generation; a ref, so asking never re-renders.
  const fetchedIdsRef = useRef(new Set<string>())
  const generationRef = useRef(0)
  const collectionsReloadingRef = useRef(false)
  // Mirrors collectionsById so callbacks can spot unknown ids synchronously.
  const collectionsByIdRef = useRef(collectionsById)

  const storeCollections = useCallback((list: Collection[]) => {
    const map = new Map(list.map(c => [c.id, c]))
    collectionsByIdRef.current = map
    setCollectionsById(map)
  }, [])

  // Start over on ↻ or a vault key change: clear what's shown during render
  // (React's "adjust state when inputs change"), then refetch in the effect.
  const [loadedFor, setLoadedFor] = useState({ dek, refreshKey })
  if (loadedFor.dek !== dek || loadedFor.refreshKey !== refreshKey) {
    setLoadedFor({ dek, refreshKey })
    setCollectionsById(new Map())
    setRefsByLink(new Map())
    setFailed(false)
  }

  useEffect(() => {
    const generation = ++generationRef.current
    fetchedIdsRef.current = new Set()
    collectionsReloadingRef.current = false
    collectionsByIdRef.current = new Map()
    if (!dek) return
    getCollections(dek)
      .then(list => { if (generation === generationRef.current) storeCollections(list) })
      .catch(() => { if (generation === generationRef.current) setFailed(true) })
  }, [dek, refreshKey, storeCollections])

  // Fetch memberships for ids not requested yet (a new page, a search, an unlock).
  const idsKey = linkIds.join(',')
  useEffect(() => {
    if (!dek) return
    const missing = linkIds.filter(id => !fetchedIdsRef.current.has(id))
    if (missing.length === 0) return
    for (const id of missing) fetchedIdsRef.current.add(id)
    const generation = generationRef.current
    getMembershipsForLinks(missing)
      .then(refs => {
        if (generation !== generationRef.current) return
        setRefsByLink(prev => {
          const next = new Map(prev)
          for (const id of missing) next.set(id, [])
          for (const ref of refs) next.set(ref.link_id, [...(next.get(ref.link_id) ?? []), ref])
          return next
        })
      })
      .catch(() => { if (generation === generationRef.current) setFailed(true) })
    // idsKey stands in for linkIds, which is a new array every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, dek, refreshKey])

  /** Reloads the collections once when any id is unknown (e.g. one just created). */
  const ensureCollections = useCallback((collectionIds: string[]) => {
    if (!dek || collectionsReloadingRef.current) return
    if (collectionIds.every(id => collectionsByIdRef.current.has(id))) return
    collectionsReloadingRef.current = true
    const generation = generationRef.current
    getCollections(dek)
      .then(list => { if (generation === generationRef.current) storeCollections(list) })
      .catch(() => {})
      .finally(() => { if (generation === generationRef.current) collectionsReloadingRef.current = false })
  }, [dek, storeCollections])

  /** Optimistic update from the picker's MembershipChangeHandler. */
  const applyMembershipChange = useCallback((
    linkId: string, collectionId: string, isMember: boolean, membership?: CollectionMembership,
  ) => {
    setRefsByLink(prev => {
      const next = new Map(prev)
      const current = (next.get(linkId) ?? []).filter(ref => ref.collection_id !== collectionId)
      if (isMember) {
        current.push({
          collection_id: collectionId,
          link_id: linkId,
          added_at: membership?.added_at ?? new Date().toISOString(),
        })
      }
      next.set(linkId, current)
      return next
    })
    if (isMember) ensureCollections([collectionId])
  }, [ensureCollections])

  /** Re-fetches one link's memberships, after an Add or Edit save. */
  const reloadLinkCollections = useCallback((linkId: string) => {
    const generation = generationRef.current
    fetchedIdsRef.current.add(linkId)
    getMembershipsForLinks([linkId])
      .then(refs => {
        if (generation !== generationRef.current) return
        setRefsByLink(prev => new Map(prev).set(linkId, refs))
        ensureCollections(refs.map(ref => ref.collection_id))
      })
      .catch(() => {})
  }, [ensureCollections])

  const collectionsFor = useCallback((linkId: string): CardCollection[] => {
    if (failed) return []
    const refs = refsByLink.get(linkId)
    if (!refs || refs.length === 0) return []
    return refs
      .filter(ref => collectionsById.has(ref.collection_id))
      .sort((a, b) => compareRefs(a, b, collectionsById))
      .map(ref => {
        const { id, name, emoji } = collectionsById.get(ref.collection_id)!
        return { id, name, emoji }
      })
  }, [failed, refsByLink, collectionsById])

  return { collectionsFor, applyMembershipChange, reloadLinkCollections }
}
