'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCollections, getCollectionCounts, countCollectionLinks,
  type Collection, type CollectionCountRow, type CollectionWithCounts,
} from '@/lib/services/collections'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'

/** Loads the collections and their structural count rows; counts follow private-tag unlocks live. */
export function useCollectionListState(dek: CryptoKey | null) {
  const { unlockedTagIds } = useUnlockedTags()
  const [collections, setCollections] = useState<Collection[]>([])
  const [countRows, setCountRows] = useState<CollectionCountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!dek) return
    let cancelled = false
    Promise.all([getCollections(dek), getCollectionCounts()])
      .then(([list, rows]) => {
        if (cancelled) return
        setCollections(list)
        setCountRows(rows)
        setLoadError(false)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [dek, attempt])

  const retry = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    setAttempt(n => n + 1)
  }, [])

  const collectionsWithCounts: CollectionWithCounts[] = useMemo(() => {
    const counts = countCollectionLinks(countRows, unlockedTagIds)
    return collections.map(c => ({ ...c, ...(counts.get(c.id) ?? { link_count: 0, done_count: 0 }) }))
  }, [collections, countRows, unlockedTagIds])

  return { collections: collectionsWithCounts, setCollections, loading, loadError, retry }
}
