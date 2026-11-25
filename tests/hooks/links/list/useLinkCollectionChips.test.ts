// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Collection, LinkCollectionRef } from '@/lib/services/collections'

const { getCollections, getMembershipsForLinks, toast } = vi.hoisted(() => ({
  getCollections: vi.fn(),
  getMembershipsForLinks: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/lib/services/collections', () => ({ getCollections, getMembershipsForLinks }))
vi.mock('sonner', () => ({ toast: Object.assign(toast, { error: toast, success: toast }) }))

import { useLinkCollectionChips } from '@/lib/hooks/links/list/useLinkCollectionChips'

const dek = {} as CryptoKey

function collection(id: string, name: string, emoji: string | null = null): Collection {
  return {
    id, name, emoji, description: null, user_id: 'u1',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  }
}
function ref(link_id: string, collection_id: string, added_at: string): LinkCollectionRef {
  return { link_id, collection_id, added_at }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

type Props = { ids: string[]; refreshKey: number }
function setup(initial: Props) {
  return renderHook(
    ({ ids, refreshKey }: Props) => useLinkCollectionChips(ids, dek, refreshKey),
    { initialProps: initial },
  )
}

beforeEach(() => {
  getCollections.mockReset()
  getMembershipsForLinks.mockReset()
  toast.mockReset()
})

describe('useLinkCollectionChips', () => {
  it('resolves a link\'s collections, most recently added first, ties by name', async () => {
    getCollections.mockResolvedValue([
      collection('c1', 'Zebra'), collection('c2', 'Alpha', '📚'), collection('c3', 'Middle'),
    ])
    getMembershipsForLinks.mockResolvedValue([
      ref('l1', 'c3', '2026-01-01T00:00:00Z'),
      ref('l1', 'c1', '2026-03-01T00:00:00Z'),
      ref('l1', 'c2', '2026-03-01T00:00:00Z'),
    ])
    const { result } = setup({ ids: ['l1'], refreshKey: 0 })
    await waitFor(() => expect(result.current.collectionsFor('l1')).toHaveLength(3))
    expect(result.current.collectionsFor('l1')).toEqual([
      { id: 'c2', name: 'Alpha', emoji: '📚' },
      { id: 'c1', name: 'Zebra', emoji: null },
      { id: 'c3', name: 'Middle', emoji: null },
    ])
    expect(result.current.collectionsFor('unknown-link')).toEqual([])
  })

  it('drops refs whose collection is not loaded', async () => {
    getCollections.mockResolvedValue([collection('c1', 'Known')])
    getMembershipsForLinks.mockResolvedValue([
      ref('l1', 'c1', '2026-01-01T00:00:00Z'), ref('l1', 'gone', '2026-02-01T00:00:00Z'),
    ])
    const { result } = setup({ ids: ['l1'], refreshKey: 0 })
    await waitFor(() => expect(result.current.collectionsFor('l1')).toHaveLength(1))
    expect(result.current.collectionsFor('l1')[0].id).toBe('c1')
  })

  it('fetches only ids it has not fetched yet, including ones that appear later', async () => {
    getCollections.mockResolvedValue([collection('c1', 'A')])
    getMembershipsForLinks.mockResolvedValue([])
    const { rerender } = setup({ ids: ['l1', 'l2'], refreshKey: 0 })
    await waitFor(() => expect(getMembershipsForLinks).toHaveBeenCalledTimes(1))
    expect(getMembershipsForLinks).toHaveBeenLastCalledWith(['l1', 'l2'])

    rerender({ ids: ['l1', 'l2', 'l3', 'l4'], refreshKey: 0 })
    await waitFor(() => expect(getMembershipsForLinks).toHaveBeenCalledTimes(2))
    expect(getMembershipsForLinks).toHaveBeenLastCalledWith(['l3', 'l4'])

    // A search that narrows to already-fetched ids asks for nothing.
    rerender({ ids: ['l2'], refreshKey: 0 })
    // A link revealed later (e.g. a private-tag unlock) is fetched on its own.
    rerender({ ids: ['l2', 'l5'], refreshKey: 0 })
    await waitFor(() => expect(getMembershipsForLinks).toHaveBeenCalledTimes(3))
    expect(getMembershipsForLinks).toHaveBeenLastCalledWith(['l5'])
  })

  it('refetches both lists when refreshKey changes', async () => {
    getCollections.mockResolvedValue([collection('c1', 'A')])
    getMembershipsForLinks.mockResolvedValue([])
    const { rerender } = setup({ ids: ['l1'], refreshKey: 0 })
    await waitFor(() => expect(getMembershipsForLinks).toHaveBeenCalledTimes(1))
    expect(getCollections).toHaveBeenCalledTimes(1)

    rerender({ ids: ['l1'], refreshKey: 1 })
    await waitFor(() => expect(getMembershipsForLinks).toHaveBeenCalledTimes(2))
    expect(getMembershipsForLinks).toHaveBeenLastCalledWith(['l1'])
    expect(getCollections).toHaveBeenCalledTimes(2)
  })

  it('ignores a memberships response from before a refreshKey change', async () => {
    getCollections.mockResolvedValue([collection('old', 'Old'), collection('new', 'New')])
    const stale = deferred<LinkCollectionRef[]>()
    getMembershipsForLinks
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce([ref('l1', 'new', '2026-01-01T00:00:00Z')])
    const { result, rerender } = setup({ ids: ['l1'], refreshKey: 0 })
    await waitFor(() => expect(getMembershipsForLinks).toHaveBeenCalledTimes(1))

    rerender({ ids: ['l1'], refreshKey: 1 })
    await waitFor(() => expect(result.current.collectionsFor('l1').map(c => c.id)).toEqual(['new']))

    await act(async () => { stale.resolve([ref('l1', 'old', '2026-05-01T00:00:00Z')]) })
    expect(result.current.collectionsFor('l1').map(c => c.id)).toEqual(['new'])
  })

  it('applyMembershipChange adds a collection first and removes one', async () => {
    getCollections.mockResolvedValue([collection('c1', 'One'), collection('c2', 'Two')])
    getMembershipsForLinks.mockResolvedValue([ref('l1', 'c1', '2026-01-01T00:00:00Z')])
    const { result } = setup({ ids: ['l1'], refreshKey: 0 })
    await waitFor(() => expect(result.current.collectionsFor('l1')).toHaveLength(1))

    act(() => result.current.applyMembershipChange('l1', 'c2', true, {
      collection_id: 'c2', link_id: 'l1', position: 1, added_at: '2026-06-01T00:00:00Z',
    }))
    expect(result.current.collectionsFor('l1').map(c => c.id)).toEqual(['c2', 'c1'])

    act(() => result.current.applyMembershipChange('l1', 'c1', false))
    expect(result.current.collectionsFor('l1').map(c => c.id)).toEqual(['c2'])
    // Both ids were known, so no reload.
    expect(getCollections).toHaveBeenCalledTimes(1)
  })

  it('reloads the collections once for unknown ids from applyMembershipChange, even when two arrive together', async () => {
    getCollections.mockResolvedValueOnce([collection('c1', 'One')])
    getMembershipsForLinks.mockResolvedValue([])
    const { result } = setup({ ids: ['l1'], refreshKey: 0 })
    await waitFor(() => expect(getMembershipsForLinks).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(getCollections).toHaveBeenCalledTimes(1))

    const reload = deferred<Collection[]>()
    getCollections.mockReturnValueOnce(reload.promise)
    act(() => {
      result.current.applyMembershipChange('l1', 'new1', true)
      result.current.applyMembershipChange('l1', 'new2', true)
    })
    expect(getCollections).toHaveBeenCalledTimes(2)
    expect(result.current.collectionsFor('l1')).toEqual([])

    await act(async () => {
      reload.resolve([collection('c1', 'One'), collection('new1', 'New one'), collection('new2', 'New two')])
    })
    expect(result.current.collectionsFor('l1').map(c => c.id).sort()).toEqual(['new1', 'new2'])
  })

  it('reloadLinkCollections refetches one link and reloads the collections for an unknown id', async () => {
    getCollections.mockResolvedValueOnce([collection('c1', 'One')])
    getMembershipsForLinks.mockResolvedValueOnce([ref('l1', 'c1', '2026-01-01T00:00:00Z')])
    const { result } = setup({ ids: ['l1'], refreshKey: 0 })
    await waitFor(() => expect(result.current.collectionsFor('l1')).toHaveLength(1))

    getMembershipsForLinks.mockResolvedValueOnce([ref('l1', 'fresh', '2026-07-01T00:00:00Z')])
    getCollections.mockResolvedValueOnce([collection('c1', 'One'), collection('fresh', 'Fresh')])
    act(() => result.current.reloadLinkCollections('l1'))
    await waitFor(() => expect(result.current.collectionsFor('l1').map(c => c.id)).toEqual(['fresh']))
    expect(getMembershipsForLinks).toHaveBeenLastCalledWith(['l1'])
    expect(getCollections).toHaveBeenCalledTimes(2)
  })

  it('reloadLinkCollections does not reload the collections when every id is known', async () => {
    getCollections.mockResolvedValue([collection('c1', 'One'), collection('c2', 'Two')])
    getMembershipsForLinks.mockResolvedValueOnce([])
    const { result } = setup({ ids: ['l1'], refreshKey: 0 })
    await waitFor(() => expect(getCollections).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(getMembershipsForLinks).toHaveBeenCalledTimes(1))

    getMembershipsForLinks.mockResolvedValueOnce([ref('l1', 'c2', '2026-01-01T00:00:00Z')])
    act(() => result.current.reloadLinkCollections('l1'))
    await waitFor(() => expect(result.current.collectionsFor('l1').map(c => c.id)).toEqual(['c2']))
    expect(getCollections).toHaveBeenCalledTimes(1)
  })

  it('returns [] and shows no toast when memberships fail to load', async () => {
    getCollections.mockResolvedValue([collection('c1', 'One')])
    getMembershipsForLinks.mockRejectedValue(new Error('boom'))
    const { result } = setup({ ids: ['l1'], refreshKey: 0 })
    await waitFor(() => expect(getMembershipsForLinks).toHaveBeenCalledTimes(1))
    await act(async () => {})
    expect(result.current.collectionsFor('l1')).toEqual([])
    expect(toast).not.toHaveBeenCalled()
  })

  it('returns [] when the collections fail to load', async () => {
    getCollections.mockRejectedValue(new Error('boom'))
    getMembershipsForLinks.mockResolvedValue([ref('l1', 'c1', '2026-01-01T00:00:00Z')])
    const { result } = setup({ ids: ['l1'], refreshKey: 0 })
    await waitFor(() => expect(getMembershipsForLinks).toHaveBeenCalledTimes(1))
    await act(async () => {})
    expect(result.current.collectionsFor('l1')).toEqual([])
    expect(toast).not.toHaveBeenCalled()
  })
})
