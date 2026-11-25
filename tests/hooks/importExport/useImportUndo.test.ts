// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImportUndo } from '@/lib/hooks/importExport/useImportUndo'
import type { ImportRowOutcome } from '@/lib/services/links'

const { mockDeleteImportedLinks, mockRemoveUnused, mockDeleteImportedCollections } = vi.hoisted(() => ({
  mockDeleteImportedLinks: vi.fn(),
  mockRemoveUnused: vi.fn(),
  mockDeleteImportedCollections: vi.fn(),
}))

vi.mock('@/lib/services/importExport/undoImport', () => ({
  deleteImportedLinks: mockDeleteImportedLinks,
  deleteImportedCollections: mockDeleteImportedCollections,
  removeUnusedImportCreations: mockRemoveUnused,
}))

const imported = (id: string, isFavorite = false): ImportRowOutcome =>
  ({ url: `https://e.com/${id}`, status: 'imported', metaMissing: false, id, isFavorite })

function setup() {
  const onTagsChanged = vi.fn()
  const hook = renderHook(() => useImportUndo({ onTagsChanged }))
  return { ...hook, onTagsChanged }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDeleteImportedLinks.mockResolvedValue(2)
  mockRemoveUnused.mockResolvedValue({ tags: 1, categories: 0 })
  mockDeleteImportedCollections.mockImplementation(async (ids: string[]) => ids.length)
})

describe('useImportUndo', () => {
  it('counts only imported outcomes, and favorites among them', () => {
    const { result } = setup()

    act(() => {
      result.current.recordUndoOutcome(imported('a'))
      result.current.recordUndoOutcome(imported('b', true))
      result.current.recordUndoOutcome({ url: 'https://dup.com', status: 'duplicate', id: 'dup-id' })
      result.current.recordUndoOutcome({ url: 'x', status: 'failed', reason: 'save_error' })
    })

    expect(result.current.undoLinkCount).toBe(2)
    expect(result.current.undoFavoriteCount).toBe(1)
  })

  it('does not enter the confirm step when nothing was saved', () => {
    const { result } = setup()

    act(() => result.current.requestUndo())

    expect(result.current.undoState).toEqual({ phase: 'idle' })
  })

  it('deletes nothing until confirmed, and Keep goes back to idle', () => {
    const { result } = setup()
    act(() => result.current.recordUndoOutcome(imported('a')))

    act(() => result.current.requestUndo())
    expect(result.current.undoState).toEqual({ phase: 'confirming' })
    act(() => result.current.cancelUndo())

    expect(result.current.undoState).toEqual({ phase: 'idle' })
    expect(mockDeleteImportedLinks).not.toHaveBeenCalled()
  })

  it('deletes the saved links, then cleans up the created tags and categories', async () => {
    const { result, onTagsChanged } = setup()
    act(() => {
      result.current.recordUndoOutcome(imported('a'))
      result.current.recordUndoOutcome(imported('b', true))
      result.current.recordUndoCreate('tag', 't1')
      result.current.recordUndoCreate('category', 'c1')
      result.current.requestUndo()
    })

    await act(async () => result.current.confirmUndo())

    expect(mockDeleteImportedLinks).toHaveBeenCalledWith(['a', 'b'])
    expect(mockRemoveUnused).toHaveBeenCalledWith({ tagIds: ['t1'], categoryIds: ['c1'] })
    expect(onTagsChanged).toHaveBeenCalledTimes(1)
    expect(result.current.undoState).toEqual({ phase: 'done', deleted: 2, collections: 0, tags: 1, categories: 0 })
  })

  it('shows the deleting phase while the delete is in flight', async () => {
    let resolveDelete!: (n: number) => void
    mockDeleteImportedLinks.mockReturnValue(new Promise(r => { resolveDelete = r }))
    const { result } = setup()
    act(() => {
      result.current.recordUndoOutcome(imported('a'))
      result.current.requestUndo()
    })

    act(() => result.current.confirmUndo())
    expect(result.current.undoState).toEqual({ phase: 'deleting' })

    await act(async () => resolveDelete(1))
    expect(result.current.undoState.phase).toBe('done')
  })

  it('reports delete_error and skips the cleanup when the link delete fails; retry runs both steps', async () => {
    mockDeleteImportedLinks.mockResolvedValueOnce(null)
    const { result } = setup()
    act(() => {
      result.current.recordUndoOutcome(imported('a'))
      result.current.requestUndo()
    })

    await act(async () => result.current.confirmUndo())
    expect(result.current.undoState).toEqual({ phase: 'delete_error' })
    expect(mockRemoveUnused).not.toHaveBeenCalled()

    await act(async () => result.current.retryUndo())
    expect(mockDeleteImportedLinks).toHaveBeenCalledTimes(2)
    expect(result.current.undoState).toEqual({ phase: 'done', deleted: 1, collections: 0, tags: 1, categories: 0 })
  })

  it('reports cleanup_error with the deleted count; retrying the cleanup never deletes links again', async () => {
    mockRemoveUnused.mockResolvedValueOnce(null)
    const { result, onTagsChanged } = setup()
    act(() => {
      result.current.recordUndoOutcome(imported('a'))
      result.current.recordUndoOutcome(imported('b'))
      result.current.requestUndo()
    })

    await act(async () => result.current.confirmUndo())
    expect(result.current.undoState).toEqual({ phase: 'cleanup_error', deleted: 2 })
    expect(onTagsChanged).toHaveBeenCalledTimes(1)

    await act(async () => result.current.retryUndoCleanup())
    expect(mockDeleteImportedLinks).toHaveBeenCalledTimes(1)
    expect(mockRemoveUnused).toHaveBeenCalledTimes(2)
    expect(result.current.undoState).toEqual({ phase: 'done', deleted: 2, collections: 0, tags: 1, categories: 0 })
  })

  it('reset clears what was collected', () => {
    const { result } = setup()
    act(() => {
      result.current.recordUndoOutcome(imported('a', true))
      result.current.recordUndoCreate('tag', 't1')
      result.current.requestUndo()
    })

    act(() => result.current.resetUndo())

    expect(result.current.undoLinkCount).toBe(0)
    expect(result.current.undoFavoriteCount).toBe(0)
    expect(result.current.undoState).toEqual({ phase: 'idle' })
    act(() => result.current.requestUndo())
    expect(result.current.undoState).toEqual({ phase: 'idle' })
  })

  describe('collections', () => {
    it('records a created collection as a collection, not a category', async () => {
      const { result } = setup()
      act(() => {
        result.current.recordUndoOutcome(imported('a'))
        result.current.recordUndoCreate('tag', 't1')
        result.current.recordUndoCreate('category', 'c1')
        result.current.recordUndoCreate('collection', 'col1')
      })
      expect(result.current.undoCollectionCount).toBe(1)

      act(() => result.current.requestUndo())
      await act(async () => result.current.confirmUndo())

      expect(mockDeleteImportedCollections).toHaveBeenCalledWith(['col1'])
      expect(mockRemoveUnused).toHaveBeenCalledWith({ tagIds: ['t1'], categoryIds: ['c1'] })
    })

    it('enters the confirm step with no saved links when collections were created', () => {
      const { result } = setup()
      act(() => result.current.recordUndoCreate('collection', 'col1'))

      act(() => result.current.requestUndo())

      expect(result.current.undoState).toEqual({ phase: 'confirming' })
    })

    it('skips the link delete with no saved links and runs only the cleanup, collections first', async () => {
      const order: string[] = []
      mockDeleteImportedCollections.mockImplementation(async () => { order.push('collections'); return 2 })
      mockRemoveUnused.mockImplementation(async () => { order.push('unused'); return { tags: 0, categories: 0 } })
      const { result } = setup()
      act(() => {
        result.current.recordUndoCreate('collection', 'col1')
        result.current.recordUndoCreate('collection', 'col2')
      })

      act(() => result.current.requestUndo())
      await act(async () => result.current.confirmUndo())

      expect(mockDeleteImportedLinks).not.toHaveBeenCalled()
      expect(order).toEqual(['collections', 'unused'])
      expect(result.current.undoState).toEqual({ phase: 'done', deleted: 0, collections: 2, tags: 0, categories: 0 })
    })

    it('deletes links first, then the collections in the cleanup', async () => {
      const { result } = setup()
      act(() => {
        result.current.recordUndoOutcome(imported('a'))
        result.current.recordUndoOutcome(imported('b'))
        result.current.recordUndoCreate('collection', 'col1')
      })

      act(() => result.current.requestUndo())
      await act(async () => result.current.confirmUndo())

      expect(mockDeleteImportedLinks).toHaveBeenCalledWith(['a', 'b'])
      expect(mockDeleteImportedLinks.mock.invocationCallOrder[0])
        .toBeLessThan(mockDeleteImportedCollections.mock.invocationCallOrder[0])
      expect(result.current.undoState).toEqual({ phase: 'done', deleted: 2, collections: 1, tags: 1, categories: 0 })
    })

    it('reports cleanup_error when the collection delete fails; Retry cleanup runs it again', async () => {
      mockDeleteImportedCollections.mockResolvedValueOnce(null)
      const { result } = setup()
      act(() => {
        result.current.recordUndoOutcome(imported('a'))
        result.current.recordUndoCreate('collection', 'col1')
      })

      act(() => result.current.requestUndo())
      await act(async () => result.current.confirmUndo())
      expect(result.current.undoState).toEqual({ phase: 'cleanup_error', deleted: 1 })
      expect(mockRemoveUnused).not.toHaveBeenCalled()

      await act(async () => result.current.retryUndoCleanup())

      expect(mockDeleteImportedCollections).toHaveBeenCalledTimes(2)
      expect(mockDeleteImportedLinks).toHaveBeenCalledTimes(1)
      expect(result.current.undoState).toEqual({ phase: 'done', deleted: 1, collections: 1, tags: 1, categories: 0 })
    })

    it('reset clears the recorded collections', () => {
      const { result } = setup()
      act(() => result.current.recordUndoCreate('collection', 'col1'))

      act(() => result.current.resetUndo())
      act(() => result.current.requestUndo())

      expect(result.current.undoCollectionCount).toBe(0)
      expect(result.current.undoState).toEqual({ phase: 'idle' })
    })
  })
})
