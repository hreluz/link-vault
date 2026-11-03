// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePaginatedQuery, type PageResult } from '@/lib/hooks/shared/usePaginatedQuery'

type Item = { id: string }

function makeFetchPage(all: Item[]) {
  return vi.fn(async (_params: unknown, limit: number, offset: number): Promise<PageResult<Item>> => ({
    items: all.slice(offset, offset + limit),
    totalCount: all.length,
  }))
}

async function renderLoaded(fetchPage: ReturnType<typeof makeFetchPage>, params: unknown = {}, pageSize = 2) {
  const utils = renderHook(
    ({ p }) => usePaginatedQuery(p, fetchPage, pageSize),
    { initialProps: { p: params } },
  )
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('usePaginatedQuery', () => {
  it('starts in a loading state with no items', () => {
    const fetchPage = makeFetchPage([{ id: '1' }])
    const { result } = renderHook(() => usePaginatedQuery({}, fetchPage, 2))
    expect(result.current.loading).toBe(true)
    expect(result.current.items).toHaveLength(0)
  })

  it('loads the first page on mount', async () => {
    const all = [{ id: '1' }, { id: '2' }, { id: '3' }]
    const fetchPage = makeFetchPage(all)
    const { result } = await renderLoaded(fetchPage, {}, 2)

    expect(fetchPage).toHaveBeenCalledWith({}, 2, 0)
    expect(result.current.items).toEqual([{ id: '1' }, { id: '2' }])
    expect(result.current.totalCount).toBe(3)
    expect(result.current.hasMore).toBe(true)
  })

  it('reports hasMore as false once every item has been fetched', async () => {
    const all = [{ id: '1' }, { id: '2' }]
    const fetchPage = makeFetchPage(all)
    const { result } = await renderLoaded(fetchPage, {}, 2)
    expect(result.current.hasMore).toBe(false)
  })

  describe('loadMore', () => {
    it('fetches the next page at the correct offset and appends it', async () => {
      const all = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]
      const fetchPage = makeFetchPage(all)
      const { result } = await renderLoaded(fetchPage, {}, 2)

      await act(async () => { result.current.loadMore() })

      expect(fetchPage).toHaveBeenLastCalledWith({}, 2, 2)
      expect(result.current.items).toEqual(all)
      expect(result.current.hasMore).toBe(false)
    })

    it('ignores a second loadMore call while one is already in flight', async () => {
      const all = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]
      let resolveFetch: (v: PageResult<Item>) => void
      const fetchPage = vi.fn()
        .mockResolvedValueOnce({ items: all.slice(0, 2), totalCount: 4 })
        .mockImplementationOnce(() => new Promise(resolve => { resolveFetch = resolve }))

      const { result } = await renderLoaded(fetchPage, {}, 2)

      act(() => { result.current.loadMore() })
      act(() => { result.current.loadMore() })

      expect(fetchPage).toHaveBeenCalledTimes(2) // one for initial load, one for the single loadMore

      await act(async () => { resolveFetch!({ items: all.slice(2, 4), totalCount: 4 }) })
      expect(result.current.items).toEqual(all)
    })

    it('does not desync the offset when items shrink locally between loads (e.g. an optimistic removal)', async () => {
      const all = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]
      const fetchPage = makeFetchPage(all)
      const { result } = await renderLoaded(fetchPage, {}, 2)

      act(() => { result.current.setItems(prev => prev.filter(i => i.id !== '1')) })
      expect(result.current.items).toEqual([{ id: '2' }])

      await act(async () => { result.current.loadMore() })

      // offset is tracked independently of items.length, so this must request offset 2, not 1
      expect(fetchPage).toHaveBeenLastCalledWith({}, 2, 2)
      expect(result.current.items).toEqual([{ id: '2' }, { id: '3' }, { id: '4' }])
    })

    it('drops items already loaded when a later page repeats them, but still advances the offset', async () => {
      const fetchPage = vi.fn(async (_params: unknown, _limit: number, offset: number): Promise<PageResult<Item>> => (
        offset === 0
          ? { items: [{ id: '1' }, { id: '2' }], totalCount: 5 }
          : offset === 2
            ? { items: [{ id: '2' }, { id: '3' }], totalCount: 5 }
            : { items: [{ id: '4' }], totalCount: 5 }
      ))
      const { result } = await renderLoaded(fetchPage, {}, 2)

      await act(async () => { result.current.loadMore() })
      expect(result.current.items).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }])

      await act(async () => { result.current.loadMore() })
      expect(fetchPage).toHaveBeenLastCalledWith({}, 2, 4)
      expect(result.current.items).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }])
    })
  })

  describe('params change', () => {
    it('resets to page 0 and refetches when params change', async () => {
      const all = [{ id: '1' }, { id: '2' }, { id: '3' }]
      const fetchPage = makeFetchPage(all)
      const utils = renderHook(
        ({ p }) => usePaginatedQuery(p, fetchPage, 2),
        { initialProps: { p: { q: 'a' } } },
      )
      await waitFor(() => expect(utils.result.current.loading).toBe(false))

      await act(async () => { utils.result.current.loadMore() })
      expect(utils.result.current.items).toHaveLength(3)

      fetchPage.mockClear()
      utils.rerender({ p: { q: 'b' } })

      expect(utils.result.current.loading).toBe(true)
      await waitFor(() => expect(utils.result.current.loading).toBe(false))
      expect(fetchPage).toHaveBeenCalledWith({ q: 'b' }, 2, 0)
      expect(utils.result.current.items).toEqual([{ id: '1' }, { id: '2' }])
    })
  })

  describe('setItems', () => {
    it('exposes a setter so callers can layer local mutations on top', async () => {
      const fetchPage = makeFetchPage([{ id: '1' }, { id: '2' }])
      const { result } = await renderLoaded(fetchPage, {}, 2)

      act(() => { result.current.setItems(prev => prev.map(i => ({ id: `${i.id}0` }))) })

      expect(result.current.items).toEqual([{ id: '10' }, { id: '20' }])
    })
  })

  describe('refresh', () => {
    it('after loadMore, leaves exactly page 1 with the new totalCount', async () => {
      const all = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]
      const fetchPage = makeFetchPage(all)
      const { result } = await renderLoaded(fetchPage, {}, 2)

      await act(async () => { result.current.loadMore() })
      expect(result.current.items).toHaveLength(4)

      all.unshift({ id: '0' })
      await act(async () => { await result.current.refresh() })

      expect(fetchPage).toHaveBeenLastCalledWith({}, 2, 0)
      expect(result.current.items).toEqual([{ id: '0' }, { id: '1' }])
      expect(result.current.totalCount).toBe(5)
      expect(result.current.hasMore).toBe(true)
      expect(result.current.refreshing).toBe(false)

      await act(async () => { result.current.loadMore() })
      expect(fetchPage).toHaveBeenLastCalledWith({}, 2, 2)
      expect(result.current.items).toEqual([{ id: '0' }, { id: '1' }, { id: '2' }, { id: '3' }])
    })

    it('keeps items visible and loading false while refreshing', async () => {
      let resolveFetch: (v: PageResult<Item>) => void
      const fetchPage = vi.fn()
        .mockResolvedValueOnce({ items: [{ id: '1' }], totalCount: 1 })
        .mockImplementationOnce(() => new Promise(resolve => { resolveFetch = resolve }))
      const { result } = await renderLoaded(fetchPage, {}, 2)

      let refreshPromise: Promise<void>
      act(() => { refreshPromise = result.current.refresh() })

      expect(result.current.refreshing).toBe(true)
      expect(result.current.loading).toBe(false)
      expect(result.current.items).toEqual([{ id: '1' }])

      await act(async () => {
        resolveFetch!({ items: [{ id: '2' }, { id: '1' }], totalCount: 2 })
        await refreshPromise
      })
      expect(result.current.refreshing).toBe(false)
      expect(result.current.items).toEqual([{ id: '2' }, { id: '1' }])
      expect(result.current.totalCount).toBe(2)
    })

    it('keeps the old items, clears refreshing and rejects when the fetch fails', async () => {
      const fetchPage = vi.fn()
        .mockResolvedValueOnce({ items: [{ id: '1' }], totalCount: 1 })
        .mockRejectedValueOnce(new Error('offline'))
      const { result } = await renderLoaded(fetchPage, {}, 2)

      await act(async () => {
        await expect(result.current.refresh()).rejects.toThrow('offline')
      })

      expect(result.current.refreshing).toBe(false)
      expect(result.current.items).toEqual([{ id: '1' }])
      expect(result.current.totalCount).toBe(1)
    })

    it('discards its result when params change during the refresh', async () => {
      let resolveRefresh: (v: PageResult<Item>) => void
      const fetchPage = vi.fn(async (params: { q: string }): Promise<PageResult<Item>> =>
        params.q === 'a' ? { items: [{ id: '1' }], totalCount: 1 } : { items: [{ id: '9' }], totalCount: 1 },
      )
      const utils = renderHook(
        ({ p }) => usePaginatedQuery(p, fetchPage, 2),
        { initialProps: { p: { q: 'a' } } },
      )
      await waitFor(() => expect(utils.result.current.loading).toBe(false))

      fetchPage.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve }))
      let refreshPromise: Promise<void>
      act(() => { refreshPromise = utils.result.current.refresh() })
      expect(utils.result.current.refreshing).toBe(true)

      utils.rerender({ p: { q: 'b' } })
      expect(utils.result.current.refreshing).toBe(false)
      await waitFor(() => expect(utils.result.current.loading).toBe(false))
      expect(utils.result.current.items).toEqual([{ id: '9' }])

      await act(async () => {
        resolveRefresh!({ items: [{ id: '1' }, { id: '2' }], totalCount: 2 })
        await refreshPromise
      })
      expect(utils.result.current.items).toEqual([{ id: '9' }])
      expect(utils.result.current.totalCount).toBe(1)
    })
  })

  describe('fetchedItems', () => {
    it('matches the first page', async () => {
      const fetchPage = makeFetchPage([{ id: '1' }, { id: '2' }, { id: '3' }])
      const { result } = await renderLoaded(fetchPage, {}, 2)
      expect(result.current.fetchedItems).toEqual([{ id: '1' }, { id: '2' }])
    })

    it('grows on loadMore and is replaced on refresh', async () => {
      const all = [{ id: '1' }, { id: '2' }, { id: '3' }]
      const fetchPage = makeFetchPage(all)
      const { result } = await renderLoaded(fetchPage, {}, 2)

      await act(async () => { result.current.loadMore() })
      expect(result.current.fetchedItems).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }])

      all.splice(0, 3, { id: '7' })
      await act(async () => { await result.current.refresh() })
      expect(result.current.fetchedItems).toEqual([{ id: '7' }])
    })

    it('de-duplicates an id a later page repeats', async () => {
      const fetchPage = vi.fn(async (_params: unknown, _limit: number, offset: number): Promise<PageResult<Item>> =>
        offset === 0
          ? { items: [{ id: '1' }, { id: '2' }], totalCount: 4 }
          : { items: [{ id: '2' }, { id: '3' }], totalCount: 4 },
      )
      const { result } = await renderLoaded(fetchPage, {}, 2)
      await act(async () => { result.current.loadMore() })
      expect(result.current.fetchedItems).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }])
    })

    it('is not changed by setItems', async () => {
      const fetchPage = makeFetchPage([{ id: '1' }, { id: '2' }])
      const { result } = await renderLoaded(fetchPage, {}, 2)

      act(() => result.current.setItems(prev => prev.filter(item => item.id !== '1')))

      expect(result.current.items).toEqual([{ id: '2' }])
      expect(result.current.fetchedItems).toEqual([{ id: '1' }, { id: '2' }])
    })

    it('is reset by a params change', async () => {
      const fetchPage = vi.fn(async (params: { q: string }): Promise<PageResult<Item>> =>
        ({ items: [{ id: params.q }], totalCount: 1 }),
      )
      const utils = renderHook(({ p }) => usePaginatedQuery(p, fetchPage, 2), { initialProps: { p: { q: 'a' } } })
      await waitFor(() => expect(utils.result.current.loading).toBe(false))

      utils.rerender({ p: { q: 'b' } })
      expect(utils.result.current.fetchedItems).toEqual([])
      await waitFor(() => expect(utils.result.current.loading).toBe(false))
      expect(utils.result.current.fetchedItems).toEqual([{ id: 'b' }])
    })

    it('ignores a refresh made stale by a params change', async () => {
      let resolveRefresh: (v: PageResult<Item>) => void
      const fetchPage = vi.fn(async (params: { q: string }): Promise<PageResult<Item>> =>
        ({ items: [{ id: params.q }], totalCount: 1 }),
      )
      const utils = renderHook(({ p }) => usePaginatedQuery(p, fetchPage, 2), { initialProps: { p: { q: 'a' } } })
      await waitFor(() => expect(utils.result.current.loading).toBe(false))

      fetchPage.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve }))
      let refreshPromise: Promise<void>
      act(() => { refreshPromise = utils.result.current.refresh() })
      utils.rerender({ p: { q: 'b' } })
      await waitFor(() => expect(utils.result.current.loading).toBe(false))

      await act(async () => {
        resolveRefresh!({ items: [{ id: 'stale' }], totalCount: 1 })
        await refreshPromise
      })
      expect(utils.result.current.fetchedItems).toEqual([{ id: 'b' }])
    })
  })

  describe('errors', () => {
    it('starts with no error', async () => {
      const { result } = await renderLoaded(makeFetchPage([{ id: '1' }]))
      expect(result.current.error).toBeNull()
    })

    it("reports a failed first load as 'load', with loading off and nothing loaded", async () => {
      const fetchPage = vi.fn().mockRejectedValueOnce(new Error('offline'))
      const { result } = renderHook(() => usePaginatedQuery({}, fetchPage, 2))

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.error).toBe('load')
      expect(result.current.items).toEqual([])
      expect(result.current.hasMore).toBe(false)
    })

    it('retry() after a failed first load refetches page 1 and clears the error', async () => {
      const fetchPage = vi.fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce({ items: [{ id: '1' }, { id: '2' }], totalCount: 3 })
      const { result } = renderHook(() => usePaginatedQuery({}, fetchPage, 2))
      await waitFor(() => expect(result.current.error).toBe('load'))

      act(() => { result.current.retry() })
      expect(result.current.error).toBeNull()
      expect(result.current.loading).toBe(true)

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(fetchPage).toHaveBeenLastCalledWith({}, 2, 0)
      expect(result.current.items).toEqual([{ id: '1' }, { id: '2' }])
      expect(result.current.error).toBeNull()
      expect(result.current.hasMore).toBe(true)
    })

    it("reports a failed loadMore as 'loadMore' and keeps the loaded items", async () => {
      const fetchPage = vi.fn()
        .mockResolvedValueOnce({ items: [{ id: '1' }, { id: '2' }], totalCount: 4 })
        .mockRejectedValueOnce(new Error('offline'))
      const { result } = await renderLoaded(fetchPage, {}, 2)

      await act(async () => { result.current.loadMore() })

      expect(result.current.error).toBe('loadMore')
      expect(result.current.loadingMore).toBe(false)
      expect(result.current.items).toEqual([{ id: '1' }, { id: '2' }])
      expect(result.current.hasMore).toBe(true)
    })

    it('a failed loadMore does not block later loads: retry() fetches the same offset, then scrolling continues', async () => {
      const all = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }]
      const fetchPage = vi.fn(async (_p: unknown, limit: number, offset: number): Promise<PageResult<Item>> => ({
        items: all.slice(offset, offset + limit), totalCount: all.length,
      }))
      const { result } = await renderLoaded(fetchPage, {}, 2)

      fetchPage.mockRejectedValueOnce(new Error('offline'))
      await act(async () => { result.current.loadMore() })
      expect(result.current.error).toBe('loadMore')

      await act(async () => { result.current.retry() })
      expect(fetchPage).toHaveBeenLastCalledWith({}, 2, 2)
      expect(result.current.error).toBeNull()
      expect(result.current.items).toEqual(all.slice(0, 4))

      await act(async () => { result.current.loadMore() })
      expect(fetchPage).toHaveBeenLastCalledWith({}, 2, 4)
      expect(result.current.items).toEqual(all)
    })

    it('a new loadMore clears a previous loadMore error', async () => {
      const fetchPage = vi.fn()
        .mockResolvedValueOnce({ items: [{ id: '1' }], totalCount: 2 })
        .mockRejectedValueOnce(new Error('offline'))
        .mockImplementationOnce(() => new Promise(() => {}))
      const { result } = await renderLoaded(fetchPage, {}, 1)

      await act(async () => { result.current.loadMore() })
      expect(result.current.error).toBe('loadMore')

      act(() => { result.current.loadMore() })
      expect(result.current.error).toBeNull()
      expect(result.current.loadingMore).toBe(true)
    })

    it('retry() is a no-op when nothing failed', async () => {
      const fetchPage = makeFetchPage([{ id: '1' }])
      const { result } = await renderLoaded(fetchPage)

      act(() => { result.current.retry() })

      expect(fetchPage).toHaveBeenCalledTimes(1)
    })

    it('a params change clears the error', async () => {
      const fetchPage = vi.fn(async (params: { q: string }): Promise<PageResult<Item>> => {
        if (params.q === 'a') throw new Error('offline')
        return { items: [{ id: params.q }], totalCount: 1 }
      })
      const utils = renderHook(({ p }) => usePaginatedQuery(p, fetchPage, 2), { initialProps: { p: { q: 'a' } } })
      await waitFor(() => expect(utils.result.current.error).toBe('load'))

      utils.rerender({ p: { q: 'b' } })
      expect(utils.result.current.error).toBeNull()
      await waitFor(() => expect(utils.result.current.loading).toBe(false))
      expect(utils.result.current.items).toEqual([{ id: 'b' }])
      expect(utils.result.current.error).toBeNull()
    })

    it('ignores a failed first load made stale by a params change', async () => {
      let rejectStale: (err: Error) => void
      const fetchPage = vi.fn(async (params: { q: string }): Promise<PageResult<Item>> =>
        ({ items: [{ id: params.q }], totalCount: 1 }),
      )
      fetchPage.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectStale = reject }))
      const utils = renderHook(({ p }) => usePaginatedQuery(p, fetchPage, 2), { initialProps: { p: { q: 'a' } } })

      utils.rerender({ p: { q: 'b' } })
      await waitFor(() => expect(utils.result.current.loading).toBe(false))

      await act(async () => { rejectStale!(new Error('offline')) })
      expect(utils.result.current.error).toBeNull()
      expect(utils.result.current.items).toEqual([{ id: 'b' }])
    })

    it('ignores a failed loadMore made stale by a params change, and later loads still work', async () => {
      let rejectStale: (err: Error) => void
      const fetchPage = vi.fn(async (params: { q: string }, limit: number, offset: number): Promise<PageResult<Item>> => {
        const all = [{ id: `${params.q}1` }, { id: `${params.q}2` }]
        return { items: all.slice(offset, offset + limit), totalCount: all.length }
      })
      const utils = renderHook(({ p }) => usePaginatedQuery(p, fetchPage, 1), { initialProps: { p: { q: 'a' } } })
      await waitFor(() => expect(utils.result.current.loading).toBe(false))

      fetchPage.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectStale = reject }))
      act(() => { utils.result.current.loadMore() })
      utils.rerender({ p: { q: 'b' } })
      await waitFor(() => expect(utils.result.current.loading).toBe(false))

      await act(async () => { rejectStale!(new Error('offline')) })
      expect(utils.result.current.error).toBeNull()
      expect(utils.result.current.loadingMore).toBe(false)

      await act(async () => { utils.result.current.loadMore() })
      expect(utils.result.current.items).toEqual([{ id: 'b1' }, { id: 'b2' }])
    })

    it('a failed refresh keeps the items and leaves error unchanged; a successful one clears a loadMore error', async () => {
      const fetchPage = vi.fn()
        .mockResolvedValueOnce({ items: [{ id: '1' }], totalCount: 2 })
        .mockRejectedValueOnce(new Error('offline'))   // loadMore
        .mockRejectedValueOnce(new Error('offline'))   // refresh
        .mockResolvedValueOnce({ items: [{ id: '1' }], totalCount: 2 }) // refresh
      const { result } = await renderLoaded(fetchPage, {}, 1)

      await act(async () => { result.current.loadMore() })
      expect(result.current.error).toBe('loadMore')

      await act(async () => {
        await expect(result.current.refresh()).rejects.toThrow('offline')
      })
      expect(result.current.items).toEqual([{ id: '1' }])
      expect(result.current.error).toBe('loadMore')

      await act(async () => { await result.current.refresh() })
      expect(result.current.error).toBeNull()
    })
  })

  describe('meta', () => {
    type Meta = { extra: number }
    function makeMetaFetchPage(all: Item[]) {
      let call = 0
      return vi.fn(async (_params: unknown, limit: number, offset: number): Promise<PageResult<Item, Meta>> => ({
        items: all.slice(offset, offset + limit),
        totalCount: all.length,
        meta: { extra: ++call },
      }))
    }

    it('is undefined while loading and exposes the first page meta', async () => {
      const fetchPage = makeMetaFetchPage([{ id: '1' }])
      const { result } = renderHook(() => usePaginatedQuery({}, fetchPage, 2))
      expect(result.current.meta).toBeUndefined()
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.meta).toEqual({ extra: 1 })
    })

    it('takes the latest meta on loadMore and refresh', async () => {
      const fetchPage = makeMetaFetchPage([{ id: '1' }, { id: '2' }, { id: '3' }])
      const { result } = renderHook(() => usePaginatedQuery({}, fetchPage, 2))
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => { result.current.loadMore() })
      expect(result.current.meta).toEqual({ extra: 2 })

      await act(async () => { await result.current.refresh() })
      expect(result.current.meta).toEqual({ extra: 3 })
    })

    it('ignores meta from a refresh made stale by a params change', async () => {
      let resolveRefresh: (v: PageResult<Item, Meta>) => void
      const fetchPage = vi.fn(async (params: { q: string }): Promise<PageResult<Item, Meta>> =>
        ({ items: [{ id: params.q }], totalCount: 1, meta: { extra: params.q === 'a' ? 1 : 2 } }),
      )
      const utils = renderHook(
        ({ p }) => usePaginatedQuery(p, fetchPage, 2),
        { initialProps: { p: { q: 'a' } } },
      )
      await waitFor(() => expect(utils.result.current.loading).toBe(false))

      fetchPage.mockImplementationOnce(() => new Promise(resolve => { resolveRefresh = resolve }))
      let refreshPromise: Promise<void>
      act(() => { refreshPromise = utils.result.current.refresh() })
      utils.rerender({ p: { q: 'b' } })
      await waitFor(() => expect(utils.result.current.loading).toBe(false))

      await act(async () => {
        resolveRefresh!({ items: [{ id: 'a' }], totalCount: 1, meta: { extra: 99 } })
        await refreshPromise
      })
      expect(utils.result.current.meta).toEqual({ extra: 2 })
    })
  })
})
