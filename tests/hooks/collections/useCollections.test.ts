// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { useCollections } from '@/lib/hooks/collections/useCollections'
import { UnlockedTagsProvider } from '@/lib/context/UnlockedTagsContext'
import { COLLECTION } from './fixtures'

const DEK = {} as CryptoKey
vi.mock('@/lib/context/VaultContext', () => ({ useVault: () => ({ dek: DEK }) }))
vi.mock('@/lib/services/collections', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/services/collections')>()
  return { ...actual, getCollections: vi.fn(), getCollectionCounts: vi.fn(), createCollection: vi.fn() }
})
import { getCollections, getCollectionCounts, createCollection } from '@/lib/services/collections'

const wrapper = ({ children }: { children: ReactNode }) => createElement(UnlockedTagsProvider, null, children)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCollections).mockResolvedValue([COLLECTION])
  vi.mocked(getCollectionCounts).mockResolvedValue([])
})

describe('useCollections (composed)', () => {
  it('clears the search query after a new collection is saved, so it is listed', async () => {
    vi.mocked(createCollection).mockResolvedValue({ data: { ...COLLECTION, id: 'c2', name: 'Weekend' }, error: null })
    const { result } = renderHook(() => useCollections(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setQuery('rust'))
    act(() => { result.current.openAdd(); result.current.setNewName('Weekend') })
    await act(() => result.current.handleAdd())

    expect(result.current.query).toBe('')
    expect(result.current.filteredCollections.map(c => c.id)).toEqual(['c2', 'c1'])
  })

  it('keeps the query when the save fails', async () => {
    vi.mocked(createCollection).mockResolvedValue({ data: null, error: 'save_failed' } as never)
    const { result } = renderHook(() => useCollections(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setQuery('rust'))
    act(() => { result.current.openAdd(); result.current.setNewName('Weekend') })
    await act(() => result.current.handleAdd())

    expect(result.current.query).toBe('rust')
  })
})
