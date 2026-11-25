// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { useCollectionListState } from '@/lib/hooks/collections/useCollectionListState'
import { UnlockedTagsProvider, useUnlockedTags } from '@/lib/context/UnlockedTagsContext'

vi.mock('@/lib/services/collections', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/services/collections')>()
  return { ...actual, getCollections: vi.fn(), getCollectionCounts: vi.fn() }
})
import { getCollections, getCollectionCounts } from '@/lib/services/collections'
const mockGet = vi.mocked(getCollections)
const mockCounts = vi.mocked(getCollectionCounts)

const DEK = {} as CryptoKey
const wrapper = ({ children }: { children: ReactNode }) => createElement(UnlockedTagsProvider, null, children)
const collection = {
  id: 'c1', user_id: 'u1', name: 'Learn Rust', emoji: '🎓', description: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('useCollectionListState', () => {
  it('loads collections with counts, and 0/0 for an empty one', async () => {
    mockGet.mockResolvedValue([collection, { ...collection, id: 'c2' }])
    mockCounts.mockResolvedValue([
      { collection_id: 'c1', status: 'read', deleted_at: null, tags: [] },
      { collection_id: 'c1', status: 'unread', deleted_at: null, tags: [] },
    ])
    const { result } = renderHook(() => useCollectionListState(DEK), { wrapper })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.collections[0]).toMatchObject({ id: 'c1', link_count: 2, done_count: 1 })
    expect(result.current.collections[1]).toMatchObject({ id: 'c2', link_count: 0, done_count: 0 })
  })

  it('shows a load error, and retry loads again', async () => {
    mockGet.mockRejectedValueOnce(new Error('x')).mockResolvedValue([collection])
    mockCounts.mockResolvedValue([])
    const { result } = renderHook(() => useCollectionListState(DEK), { wrapper })
    await waitFor(() => expect(result.current.loadError).toBe(true))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.loadError).toBe(false)
    expect(result.current.collections).toHaveLength(1)
  })

  it('counts follow private-tag unlocks without a reload', async () => {
    mockGet.mockResolvedValue([collection])
    mockCounts.mockResolvedValue([
      { collection_id: 'c1', status: 'unread', deleted_at: null, tags: [{ id: 'p', is_private: true }] },
    ])
    const { result } = renderHook(() => ({ state: useCollectionListState(DEK), unlocked: useUnlockedTags() }), { wrapper })
    await waitFor(() => expect(result.current.state.loading).toBe(false))
    expect(result.current.state.collections[0].link_count).toBe(0)
    act(() => result.current.unlocked.unlockTag('p'))
    expect(result.current.state.collections[0].link_count).toBe(1)
    expect(mockCounts).toHaveBeenCalledTimes(1)
  })
})
