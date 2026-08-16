'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

export type PageResult<T> = { items: T[]; totalCount: number }
export type FetchPage<T, P> = (params: P, limit: number, offset: number) => Promise<PageResult<T>>

export type PaginatedQuery<T> = {
  items: T[]
  setItems: Dispatch<SetStateAction<T[]>>
  totalCount: number
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  loadMore: () => void
}

type PageState<T> = {
  items: T[]
  fetchedCount: number
  totalCount: number
  loading: boolean
  loadingMore: boolean
}

function initialState<T>(): PageState<T> {
  return { items: [], fetchedCount: 0, totalCount: 0, loading: true, loadingMore: false }
}

/**
 * Generic "infinite scroll" pagination state machine: accumulates pages of
 * `T` fetched via `fetchPage`, resetting to page 1 whenever `params` changes
 * (compared by JSON-serialized identity, so callers should memoize `params`).
 * Domain-agnostic — not tied to any particular list/entity.
 */
export function usePaginatedQuery<T, P>(
  params: P,
  fetchPage: FetchPage<T, P>,
  pageSize = 40,
): PaginatedQuery<T> {
  const [state, setState] = useState<PageState<T>>(initialState)

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

    fetchPageRef.current(params, pageSize, 0).then(({ items, totalCount }) => {
      if (requestId !== requestIdRef.current) return
      setState({ items, fetchedCount: items.length, totalCount, loading: false, loadingMore: false })
    })
    // paramsKey is the intentional dependency — params itself is a new object each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, pageSize])

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    setState(prev => ({ ...prev, loadingMore: true }))

    const requestId = requestIdRef.current
    fetchPageRef.current(params, pageSize, state.fetchedCount).then(({ items: page, totalCount }) => {
      loadingMoreRef.current = false
      if (requestId !== requestIdRef.current) return
      setState(prev => ({
        items: [...prev.items, ...page],
        fetchedCount: prev.fetchedCount + page.length,
        totalCount,
        loading: false,
        loadingMore: false,
      }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, pageSize, state.fetchedCount])

  const setItems = useCallback<Dispatch<SetStateAction<T[]>>>(updater => {
    setState(prev => ({
      ...prev,
      items: typeof updater === 'function' ? (updater as (prev: T[]) => T[])(prev.items) : updater,
    }))
  }, [])

  return {
    items: state.items,
    setItems,
    totalCount: state.totalCount,
    hasMore: state.fetchedCount < state.totalCount,
    loading: state.loading,
    loadingMore: state.loadingMore,
    loadMore,
  }
}
