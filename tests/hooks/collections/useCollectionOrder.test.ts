// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { useCollectionOrder } from '@/lib/hooks/collections/useCollectionOrder'
import type { CollectionLinkRow } from '@/lib/hooks/collections/useCollectionLinks'
import { makeRow } from './fixtures'

vi.mock('@/lib/services/collections', () => ({
  swapCollectionLinkPositions: vi.fn(),
  removeLinkFromCollection: vi.fn(),
  restoreMembership: vi.fn(),
}))
const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }))
vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ addToast, dismissToast: vi.fn() }) }))
const { sonnerToast } = vi.hoisted(() => ({ sonnerToast: vi.fn() }))
vi.mock('sonner', () => ({ toast: sonnerToast }))

import { swapCollectionLinkPositions, removeLinkFromCollection, restoreMembership } from '@/lib/services/collections'
const mockSwap = vi.mocked(swapCollectionLinkPositions)
const mockRemove = vi.mocked(removeLinkFromCollection)
const mockRestore = vi.mocked(restoreMembership)

function useHarness(initial: CollectionLinkRow[]) {
  const [rows, setRows] = useState(initial)
  const visibleRows = rows.filter(row => row.link.deleted_at === null)
  return { rows, ...useCollectionOrder('c1', 'Learn Rust', rows, visibleRows, setRows) }
}

const ids = (rows: CollectionLinkRow[]) => rows.map(r => r.link.id)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCollectionOrder.move', () => {
  it('swaps with the next row optimistically and renumbers 1..N once saved', async () => {
    mockSwap.mockResolvedValue(true)
    const { result } = renderHook(() => useHarness([makeRow('a', 1), makeRow('b', 2), makeRow('c', 3)]))
    let moved: ReturnType<typeof result.current.move> = null
    act(() => { moved = result.current.move('a', 'down') })
    expect(moved!.index).toBe(1)
    expect(ids(result.current.rows)).toEqual(['b', 'a', 'c'])
    expect(result.current.isSwapping).toBe(true)
    await act(async () => { await moved!.saved })
    expect(mockSwap).toHaveBeenCalledWith('c1', 'a', 'b')
    expect(result.current.rows.map(r => r.membership.position)).toEqual([1, 2, 3])
    expect(result.current.isSwapping).toBe(false)
  })

  it('skips a hidden neighbour (row 2 in Trash) and swaps with row 3', async () => {
    mockSwap.mockResolvedValue(true)
    const { result } = renderHook(() => useHarness([makeRow('a', 1), makeRow('b', 2, { deleted_at: 'x' }), makeRow('c', 3)]))
    act(() => { result.current.move('a', 'down') })
    expect(mockSwap).toHaveBeenCalledWith('c1', 'a', 'c')
    expect(ids(result.current.rows)).toEqual(['c', 'b', 'a'])
    await waitFor(() => expect(result.current.isSwapping).toBe(false))
  })

  it('rolls back and shows "Failed to reorder" when the save fails', async () => {
    mockSwap.mockResolvedValue(false)
    const { result } = renderHook(() => useHarness([makeRow('a', 1), makeRow('b', 2)]))
    let moved: ReturnType<typeof result.current.move> = null
    act(() => { moved = result.current.move('b', 'up') })
    expect(ids(result.current.rows)).toEqual(['b', 'a'])
    await act(async () => { expect(await moved!.saved).toBe(false) })
    expect(ids(result.current.rows)).toEqual(['a', 'b'])
    expect(addToast).toHaveBeenCalledWith('Failed to reorder', 'destructive')
  })

  it('swaps two rows that tie on position, and renumbers them apart', async () => {
    mockSwap.mockResolvedValue(true)
    const { result } = renderHook(() => useHarness([makeRow('a', 5), makeRow('b', 5)]))
    let moved: ReturnType<typeof result.current.move> = null
    act(() => { moved = result.current.move('a', 'down') })
    await act(async () => { await moved!.saved })
    expect(ids(result.current.rows)).toEqual(['b', 'a'])
    expect(result.current.rows.map(r => r.membership.position)).toEqual([1, 2])
  })

  it('ignores a second ▲/▼ while a swap is saving', async () => {
    let resolve: (ok: boolean) => void = () => {}
    mockSwap.mockImplementation(() => new Promise(r => { resolve = r }))
    const { result } = renderHook(() => useHarness([makeRow('a', 1), makeRow('b', 2), makeRow('c', 3)]))
    act(() => { result.current.move('a', 'down') })
    let second: ReturnType<typeof result.current.move> = null
    act(() => { second = result.current.move('c', 'up') })
    expect(second).toBeNull()
    expect(mockSwap).toHaveBeenCalledTimes(1)
    await act(async () => { resolve(true) })
    expect(result.current.isSwapping).toBe(false)
  })

  it('returns null at the edges', () => {
    const { result } = renderHook(() => useHarness([makeRow('a', 1), makeRow('b', 2)]))
    expect(result.current.move('a', 'up')).toBeNull()
    expect(result.current.move('b', 'down')).toBeNull()
    expect(mockSwap).not.toHaveBeenCalled()
  })
})

describe('useCollectionOrder.remove', () => {
  it('removes the row and offers Undo, which puts it back in the same place', async () => {
    mockRemove.mockResolvedValue(true)
    mockRestore.mockResolvedValue(true)
    const { result } = renderHook(() => useHarness([makeRow('a', 1), makeRow('b', 2), makeRow('c', 3)]))
    await act(() => result.current.remove('b'))
    expect(ids(result.current.rows)).toEqual(['a', 'c'])
    expect(sonnerToast).toHaveBeenCalledWith('Removed from Learn Rust', expect.objectContaining({
      action: expect.objectContaining({ label: 'Undo' }),
    }))
    const { onClick } = sonnerToast.mock.calls[0][1].action
    await act(() => onClick())
    expect(mockRestore).toHaveBeenCalledWith(makeRow('b', 2).membership)
    expect(ids(result.current.rows)).toEqual(['a', 'b', 'c'])
  })

  it('brings the row back with "Failed to remove link" on failure', async () => {
    mockRemove.mockResolvedValue(false)
    const { result } = renderHook(() => useHarness([makeRow('a', 1), makeRow('b', 2)]))
    await act(() => result.current.remove('a'))
    expect(ids(result.current.rows)).toEqual(['a', 'b'])
    expect(addToast).toHaveBeenCalledWith('Failed to remove link', 'destructive')
    expect(sonnerToast).not.toHaveBeenCalled()
  })
})
