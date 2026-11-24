// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCollectionPicker } from '@/lib/hooks/collections/useCollectionPicker'
import type { Collection } from '@/lib/services/collections'
import { makeLink } from './fixtures'

vi.mock('@/lib/services/collections', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/collections')>()),
  getCollections: vi.fn(),
  getCollectionIdsForLink: vi.fn(),
  addLinksToCollection: vi.fn(),
  removeLinkFromCollection: vi.fn(),
  createCollection: vi.fn(),
}))
const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }))
vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ addToast, dismissToast: vi.fn() }) }))

import {
  getCollections, getCollectionIdsForLink, addLinksToCollection, removeLinkFromCollection, createCollection,
} from '@/lib/services/collections'

const DEK = {} as CryptoKey
const LINK = makeLink('l1')
function col(id: string, name: string): Collection {
  return { id, user_id: 'u1', name, emoji: null, description: null, created_at: 't', updated_at: 't' }
}
const membership = (collection_id: string) => ({ collection_id, link_id: 'l1', position: 1, added_at: 't' })

async function setup(collections: Collection[], memberIds: string[]) {
  vi.mocked(getCollections).mockResolvedValue(collections)
  vi.mocked(getCollectionIdsForLink).mockResolvedValue(memberIds)
  const onChange = vi.fn()
  const hook = renderHook(() => useCollectionPicker(LINK, DEK, onChange))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return { ...hook, onChange }
}

const names = (list: Collection[]) => list.map(c => c.name)

beforeEach(() => vi.clearAllMocks())

describe('useCollectionPicker', () => {
  it('lists only the link\'s collections for an empty query', async () => {
    const { result } = await setup([col('r', 'Learn Rust'), col('v', 'Rust videos'), col('g', 'Go')], ['r'])
    expect(names(result.current.visibleCollections)).toEqual(['Learn Rust'])
    expect(result.current.memberIds.has('r')).toBe(true)
  })

  it('lists nothing for a link in no collection', async () => {
    const { result } = await setup([col('r', 'Learn Rust')], [])
    expect(result.current.visibleCollections).toEqual([])
    expect(result.current.hasNoCollections).toBe(false)
  })

  it('shows typed matches, ticked ones included', async () => {
    const { result } = await setup([col('r', 'Learn Rust'), col('v', 'Rust videos'), col('g', 'Go')], ['r'])
    act(() => result.current.setQuery('rust'))
    expect(names(result.current.visibleCollections)).toEqual(['Learn Rust', 'Rust videos'])
  })

  it('caps typed matches at 8', async () => {
    const many = Array.from({ length: 10 }, (_, i) => col(`c${i}`, `Rust ${i}`))
    const { result } = await setup(many, [])
    act(() => result.current.setQuery('rust'))
    expect(result.current.visibleCollections).toHaveLength(8)
  })

  it('ticks with an immediate write, and rolls back with a toast on failure', async () => {
    const { result, onChange } = await setup([col('r', 'Learn Rust')], [])
    vi.mocked(addLinksToCollection).mockResolvedValueOnce([membership('r')])
    await act(() => result.current.toggle('r'))
    expect(result.current.memberIds.has('r')).toBe(true)
    expect(onChange).toHaveBeenCalledWith(LINK, 'r', true, membership('r'))

    vi.mocked(removeLinkFromCollection).mockResolvedValueOnce(false)
    await act(() => result.current.toggle('r'))
    expect(result.current.memberIds.has('r')).toBe(true)
    expect(addToast).toHaveBeenCalledWith('Failed to update collection', 'destructive')
  })

  it('keeps an unticked row listed for an empty query, so it can be ticked back', async () => {
    const { result } = await setup([col('r', 'Learn Rust')], ['r'])
    vi.mocked(removeLinkFromCollection).mockResolvedValueOnce(true)
    await act(() => result.current.toggle('r'))
    expect(names(result.current.visibleCollections)).toEqual(['Learn Rust'])
    expect(result.current.memberIds.has('r')).toBe(false)
  })

  it('shows the Create row only without an exact name match', async () => {
    const { result } = await setup([col('r', 'Learn Rust')], [])
    act(() => result.current.setQuery('learn rust'))
    expect(result.current.showCreate).toBe(false)
    act(() => result.current.setQuery('learn rus'))
    expect(result.current.showCreate).toBe(true)
  })

  it('Enter toggles an exact match, the first of two same-named ones', async () => {
    const { result } = await setup([col('r1', 'Learn Rust'), col('r2', 'Learn Rust')], [])
    vi.mocked(addLinksToCollection).mockResolvedValue([membership('r1')])
    act(() => result.current.setQuery('Learn Rust'))
    await act(async () => { result.current.submitQuery() })
    await waitFor(() => expect(addLinksToCollection).toHaveBeenCalledWith('r1', ['l1']))
    expect(createCollection).not.toHaveBeenCalled()
  })

  it('Enter creates when nothing matches exactly, adds the link and clears the query', async () => {
    const { result } = await setup([], [])
    vi.mocked(createCollection).mockResolvedValue({ data: col('n', 'Go basics'), error: null })
    vi.mocked(addLinksToCollection).mockResolvedValue([membership('n')])
    act(() => result.current.setQuery('Go basics'))
    await act(async () => { result.current.submitQuery() })
    await waitFor(() => expect(addLinksToCollection).toHaveBeenCalledWith('n', ['l1']))
    expect(createCollection).toHaveBeenCalledWith({ name: 'Go basics' }, DEK)
    expect(result.current.query).toBe('')
    expect(names(result.current.visibleCollections)).toEqual(['Go basics'])
    expect(result.current.memberIds.has('n')).toBe(true)
  })

  it('shows a create error inline', async () => {
    const { result } = await setup([], [])
    vi.mocked(createCollection).mockResolvedValue({ data: null, error: 'db_error' })
    act(() => result.current.setQuery('Go'))
    await act(() => result.current.createAndAdd())
    expect(result.current.createError).toBe("Couldn't save the collection. Try again.")
  })

  it('Enter on an empty query does nothing', async () => {
    const { result } = await setup([col('r', 'Learn Rust')], [])
    act(() => result.current.submitQuery())
    expect(addLinksToCollection).not.toHaveBeenCalled()
    expect(createCollection).not.toHaveBeenCalled()
  })

  it('reports a load error', async () => {
    vi.mocked(getCollections).mockRejectedValue(new Error('x'))
    vi.mocked(getCollectionIdsForLink).mockResolvedValue([])
    const { result } = renderHook(() => useCollectionPicker(LINK, DEK))
    await waitFor(() => expect(result.current.loadError).toBe(true))
  })
})
