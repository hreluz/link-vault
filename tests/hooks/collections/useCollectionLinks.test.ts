// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { useCollectionLinks } from '@/lib/hooks/collections/useCollectionLinks'
import { UnlockedTagsProvider, useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { COLLECTION, makeLink } from './fixtures'

vi.mock('@/lib/services/collections', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/collections')>()),
  getCollection: vi.fn(),
  getCollectionMemberships: vi.fn(),
  getPrivateTagIdSet: vi.fn(),
}))
vi.mock('@/lib/services/links', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/links')>()),
  getLinksByIds: vi.fn(),
}))
import { getCollection, getCollectionMemberships, getPrivateTagIdSet } from '@/lib/services/collections'
import { getLinksByIds } from '@/lib/services/links'

const DEK = {} as CryptoKey
const wrapper = ({ children }: { children: ReactNode }) => createElement(UnlockedTagsProvider, null, children)
const membership = (link_id: string, position: number) => ({ collection_id: 'c1', link_id, position, added_at: '2026-01-01T00:00:00Z' })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCollection).mockResolvedValue(COLLECTION)
  vi.mocked(getPrivateTagIdSet).mockResolvedValue(new Set(['p']))
  vi.mocked(getCollectionMemberships).mockResolvedValue([
    membership('a', 1), membership('b', 2), membership('c', 3), membership('d', 4),
  ])
  vi.mocked(getLinksByIds).mockResolvedValue([
    makeLink('d', { status: 'archived' }),
    makeLink('a', { status: 'read' }),
    makeLink('b', { deleted_at: '2026-02-01T00:00:00Z' }),
    makeLink('c', { tags: ['p'] }),
  ])
})

describe('useCollectionLinks', () => {
  it('keeps collection order and hides Trash and locked private links with no gap', async () => {
    const { result } = renderHook(() => useCollectionLinks('c1', DEK), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rows.map(r => r.link.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(result.current.visibleRows.map(r => r.link.id)).toEqual(['a', 'd'])
    expect(result.current.linkCount).toBe(2)
    expect(result.current.doneCount).toBe(2)
  })

  it('numbers visible rows 1, 2, 3 with a hidden row 2', async () => {
    vi.mocked(getLinksByIds).mockResolvedValue([makeLink('a'), makeLink('b', { deleted_at: 'x' }), makeLink('c'), makeLink('d')])
    const { result } = renderHook(() => useCollectionLinks('c1', DEK), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.visibleRows.map((r, i) => `${i + 1}:${r.link.id}`)).toEqual(['1:a', '2:c', '3:d'])
  })

  it('unlocking shows a hidden private link in its place, and locking hides it again', async () => {
    const { result } = renderHook(() => ({ data: useCollectionLinks('c1', DEK), unlocked: useUnlockedTags() }), { wrapper })
    await waitFor(() => expect(result.current.data.loading).toBe(false))
    act(() => result.current.unlocked.unlockTag('p'))
    expect(result.current.data.visibleRows.map(r => r.link.id)).toEqual(['a', 'c', 'd'])
    expect(result.current.data.linkCount).toBe(3)
    act(() => result.current.unlocked.lockAll())
    expect(result.current.data.visibleRows.map(r => r.link.id)).toEqual(['a', 'd'])
    expect(getLinksByIds).toHaveBeenCalledTimes(1)
  })

  it('reports not found for an unknown id', async () => {
    vi.mocked(getCollection).mockResolvedValue(null)
    const { result } = renderHook(() => useCollectionLinks('nope', DEK), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.notFound).toBe(true)
    expect(result.current.loadError).toBe(false)
  })

  it('reports a load error, and retry loads again', async () => {
    vi.mocked(getCollectionMemberships).mockRejectedValueOnce(new Error('down'))
    const { result } = renderHook(() => useCollectionLinks('c1', DEK), { wrapper })
    await waitFor(() => expect(result.current.loadError).toBe(true))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.loadError).toBe(false)
    expect(result.current.visibleRows).toHaveLength(2)
  })
})
