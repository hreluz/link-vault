// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useCollectionLinkActions } from '@/lib/hooks/collections/useCollectionLinkActions'
import type { CollectionLinkRow } from '@/lib/hooks/collections/useCollectionLinks'
import { makeLink, makeRow } from './fixtures'

vi.mock('@/lib/services/links', () => ({
  updateLinkStatus: vi.fn(async () => true),
  toggleLinkFavorite: vi.fn(async () => true),
  deleteLink: vi.fn(async () => 'deleted'),
  markLinkMovedToEnd: vi.fn(),
}))
vi.mock('@/lib/services/collections', () => ({ addLinksToCollection: vi.fn() }))
const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }))
vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ addToast, dismissToast: vi.fn() }) }))
vi.mock('@/lib/context/TagsContext', () => ({ useTagsContext: () => ({ tags: [], loading: false, refetchTags: vi.fn() }) }))

import { updateLinkStatus, markLinkMovedToEnd } from '@/lib/services/links'
import { addLinksToCollection } from '@/lib/services/collections'

function useHarness(initial: CollectionLinkRow[]) {
  const [rows, setRows] = useState(initial)
  return { rows, ...useCollectionLinkActions('c1', rows, setRows) }
}

beforeEach(() => vi.clearAllMocks())

describe('useCollectionLinkActions', () => {
  it('opening an unread link sets it to watching and marks it Last opened, with no move-to-end write', async () => {
    const { result } = renderHook(() => useHarness([makeRow('a', 1)]))
    await act(async () => { result.current.handleLinkOpen('a', 'unread') })
    expect(updateLinkStatus).toHaveBeenCalledWith('a', 'watching')
    expect(result.current.rows[0].link.status).toBe('watching')
    expect(result.current.lastOpenedId).toBe('a')
    expect(markLinkMovedToEnd).not.toHaveBeenCalled()
  })

  it('rolls a failed status change back with a toast', async () => {
    vi.mocked(updateLinkStatus).mockResolvedValueOnce(false)
    const { result } = renderHook(() => useHarness([makeRow('a', 1)]))
    await act(async () => { await result.current.handleStatusChange('a', 'read') })
    expect(result.current.rows[0].link.status).toBe('unread')
    expect(addToast).toHaveBeenCalledWith('Failed to update status', 'destructive')
  })

  it('drops the row when the ··· picker unticks this collection', () => {
    const { result } = renderHook(() => useHarness([makeRow('a', 1), makeRow('b', 2)]))
    act(() => result.current.handleMembershipChange(result.current.rows[0].link, 'c1', false))
    expect(result.current.rows.map(r => r.link.id)).toEqual(['b'])
  })

  it('ignores picker changes to other collections', () => {
    const { result } = renderHook(() => useHarness([makeRow('a', 1)]))
    act(() => result.current.handleMembershipChange(result.current.rows[0].link, 'other', false))
    expect(result.current.rows).toHaveLength(1)
  })

  it('drops the row when the Edit modal saved the link without this collection', () => {
    const { result } = renderHook(() => useHarness([makeRow('a', 1), makeRow('b', 2)]))
    act(() => result.current.handleEdit(makeLink('a', { title: 'New' }), ['other']))
    expect(result.current.rows.map(r => r.link.id)).toEqual(['b'])
  })

  it('updates the row in place when the Edit modal kept this collection (or left collections alone)', () => {
    const { result } = renderHook(() => useHarness([makeRow('a', 1)]))
    act(() => result.current.handleEdit(makeLink('a', { title: 'New' }), null))
    expect(result.current.rows[0].link.title).toBe('New')
  })

  it('refuses to delete a favorite', () => {
    const { result } = renderHook(() => useHarness([makeRow('a', 1, { is_favorite: true })]))
    act(() => result.current.handleDelete('a'))
    expect(addToast).toHaveBeenCalledWith('Unfavorite to delete', 'destructive')
    expect(result.current.rows[0].link.deleted_at).toBeNull()
  })

  it('soft-deletes by marking deleted_at, so the row keeps its place for Undo', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useHarness([makeRow('a', 1)]))
    act(() => result.current.handleDelete('a'))
    expect(result.current.rows[0].link.deleted_at).not.toBeNull()
    const { onClick } = addToast.mock.calls[0][2]
    act(() => onClick())
    expect(result.current.rows[0].link.deleted_at).toBeNull()
    vi.useRealTimers()
  })

  it('appendLinks adds the new links at the bottom in order', async () => {
    vi.mocked(addLinksToCollection).mockResolvedValue([
      { collection_id: 'c1', link_id: 'x', position: 2, added_at: 't' },
      { collection_id: 'c1', link_id: 'y', position: 3, added_at: 't' },
    ])
    const { result } = renderHook(() => useHarness([makeRow('a', 1)]))
    await act(async () => { await result.current.appendLinks([makeLink('x'), makeLink('y')]) })
    expect(result.current.rows.map(r => r.link.id)).toEqual(['a', 'x', 'y'])
  })
})
