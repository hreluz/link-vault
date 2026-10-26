'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

/** `meta` is optional caller-defined data about the whole result set (e.g. extra counts); the latest page's value wins. */
export type PageResult<T, M = undefined> = { items: T[]; totalCount: number; meta?: M }
export type FetchPage<T, P, M = undefined> = (params: P, limit: number, offset: number) => Promise<PageResult<T, M>>

export type PaginatedQuery<T, M = undefined> = {
  items: T[]
  setItems: Dispatch<SetStateAction<T[]>>
  /** Items exactly as fetched, before any `setItems` change -- lets callers tell what changed locally. */
  fetchedItems: T[]
  totalCount: number
  meta: M | undefined
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  loadMore: () => void
  /** Refetches page 1 with the current params, keeping current items visible until it resolves. Rejects if the fetch fails. */
  refresh: () => Promise<void>
  refreshing: boolean
}

type PageState<T, M> = {
  items: T[]
  fetchedItems: T[]
  fetchedCount: number
  totalCount: number
  meta: M | undefined
  loading: boolean
  loadingMore: boolean
  refreshing: boolean
}

function initialState<T, M>(): PageState<T, M> {
  return { items: [], fetchedItems: [], fetchedCount: 0, totalCount: 0, meta: undefined, loading: true, loadingMore: false, refreshing: false }
}

/**
 * Generic "infinite scroll" pagination state machine: accumulates pages of
 * `T` fetched via `fetchPage`, resetting to page 1 whenever `params` changes
 * (compared by JSON-serialized identity, so callers should memoize `params`).
 * Domain-agnostic — not tied to any particular list/entity. A later page
 * that repeats an already-loaded id (the server order shifted under offset
 * pagination) has that item dropped; it still counts toward the offset.
 */
export function usePaginatedQuery<T extends { id: string }, P, M = undefined>(
  params: P,
  fetchPage: FetchPage<T, P, M>,
  pageSize = 40,
): PaginatedQuery<T, M> {
  const [state, setState] = useState<PageState<T, M>>(initialState)

  const fetchPageRef = useRef(fetchPage)
  useEffect(() => { fetchPageRef.current = fetchPage })

  const requestIdRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    loadingMoreRef.current = false
    // Reset must happen synchronously before the fetch starts, so a stale page
    // from the previous params isn't shown while the new one loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(initialState())

    fetchPageRef.current(params, pageSize, 0).then(({ items, totalCount, meta }) => {
      if (requestId !== requestIdRef.current) return
      setState({ items, fetchedItems: items, fetchedCount: items.length, totalCount, meta, loading: false, loadingMore: false, refreshing: false })
    })
    // paramsKey is the intentional dependency — params itself is a new object each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, pageSize])

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    setState(prev => ({ ...prev, loadingMore: true }))

    const requestId = requestIdRef.current
    fetchPageRef.current(params, pageSize, state.fetchedCount).then(({ items: page, totalCount, meta }) => {
      loadingMoreRef.current = false
      if (requestId !== requestIdRef.current) return
      setState(prev => {
        const loadedIds = new Set(prev.items.map(item => item.id))
        const fetchedIds = new Set(prev.fetchedItems.map(item => item.id))
        return {
          items: [...prev.items, ...page.filter(item => !loadedIds.has(item.id))],
          fetchedItems: [...prev.fetchedItems, ...page.filter(item => !fetchedIds.has(item.id))],
          fetchedCount: prev.fetchedCount + page.length,
          totalCount,
          meta,
          loading: false,
          loadingMore: false,
          refreshing: prev.refreshing,
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, pageSize, state.fetchedCount])

  const refresh = useCallback(async () => {
    // A new request id makes any in-flight first load / loadMore stale, and a
    // params change during the refresh makes this one stale in turn.
    const requestId = ++requestIdRef.current
    setState(prev => ({ ...prev, refreshing: true }))

    try {
      const { items, totalCount, meta } = await fetchPageRef.current(params, pageSize, 0)
      if (requestId !== requestIdRef.current) return
      loadingMoreRef.current = false
      setState({ items, fetchedItems: items, fetchedCount: items.length, totalCount, meta, loading: false, loadingMore: false, refreshing: false })
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setState(prev => ({ ...prev, refreshing: false }))
      }
      throw err
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, pageSize])

  const setItems = useCallback<Dispatch<SetStateAction<T[]>>>(updater => {
    setState(prev => ({
      ...prev,
      items: typeof updater === 'function' ? (updater as (prev: T[]) => T[])(prev.items) : updater,
    }))
  }, [])

  return {
    items: state.items,
    setItems,
    fetchedItems: state.fetchedItems,
    totalCount: state.totalCount,
    meta: state.meta,
    hasMore: state.fetchedCount < state.totalCount,
    loading: state.loading,
    loadingMore: state.loadingMore,
    loadMore,
    refresh,
    refreshing: state.refreshing,
  }
}
