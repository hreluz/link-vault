'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCollection, getCollectionMemberships, getPrivateTagIdSet, isDoneStatus,
  type Collection, type CollectionMembership,
} from '@/lib/services/collections'
import { getLinksByIds, type LinkWithTags } from '@/lib/services/links'
import { isTagVisible } from '@/lib/services/tags/tags'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { useTagsContext } from '@/lib/context/TagsContext'

/** One membership of the collection with its decrypted link, in collection order. */
export type CollectionLinkRow = { membership: CollectionMembership; link: LinkWithTags }

/** Not in Trash and no locked private tag -- the same rule as the main list. */
export function isRowVisible(row: CollectionLinkRow, privateTagIds: Set<string>, unlockedTagIds: Set<string>): boolean {
  return row.link.deleted_at === null &&
    row.link.tags.every(tagId => isTagVisible(privateTagIds.has(tagId), tagId, unlockedTagIds))
}

/**
 * Loads a collection, its memberships in order and their links. `rows` keeps every
 * membership (hidden ones too, so their places survive); `visibleRows` is what the
 * page shows and counts, recomputed when private tags are locked or unlocked.
 */
export function useCollectionLinks(collectionId: string, dek: CryptoKey | null) {
  const { unlockedTagIds } = useUnlockedTags()
  const { tags } = useTagsContext()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [rows, setRows] = useState<CollectionLinkRow[]>([])
  const [privateTagIds, setPrivateTagIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!dek) return
    let cancelled = false
    async function load(key: CryptoKey) {
      const found = await getCollection(collectionId, key)
      if (!found) return { found: null, rows: [], privateIds: new Set<string>() }
      const [memberships, privateIds] = await Promise.all([getCollectionMemberships(collectionId), getPrivateTagIdSet()])
      const links = await getLinksByIds(memberships.map(m => m.link_id), key)
      const linkById = new Map(links.map(link => [link.id, link]))
      const loaded = memberships.flatMap(membership => {
        const link = linkById.get(membership.link_id)
        return link ? [{ membership, link }] : []
      })
      return { found, rows: loaded, privateIds }
    }
    load(dek)
      .then(result => {
        if (cancelled) return
        setCollection(result.found)
        setNotFound(result.found === null)
        setRows(result.rows)
        setPrivateTagIds(result.privateIds)
        setLoadError(false)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [collectionId, dek, attempt])

  const retry = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    setAttempt(n => n + 1)
  }, [])

  // Private ids read at load time, plus any the tags cache knows about since.
  const allPrivateTagIds = useMemo(() => {
    const ids = new Set(privateTagIds)
    for (const tag of tags) if (tag.is_private) ids.add(tag.id)
    return ids
  }, [privateTagIds, tags])

  const visibleRows = useMemo(
    () => rows.filter(row => isRowVisible(row, allPrivateTagIds, unlockedTagIds)),
    [rows, allPrivateTagIds, unlockedTagIds],
  )

  const linkCount = visibleRows.length
  const doneCount = visibleRows.filter(row => isDoneStatus(row.link.status)).length

  return {
    collection, setCollection, rows, setRows, visibleRows, linkCount, doneCount,
    loading, loadError, notFound, retry,
  }
}
