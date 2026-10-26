// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useLinkMutations } from '@/lib/hooks/links/list/useLinkMutations'
import type { LinkWithTags, LinkFilterParams } from '@/lib/services/links'

const mockAddToast = vi.fn()
const mockDismissToast = vi.fn()

const { LINK_A, LINK_B } = vi.hoisted(() => {
  const LINK_A: LinkWithTags = {
    id: '1', title: 'Alpha', site_name: 'alpha.com',
    status: 'unread', is_favorite: false, deleted_at: null, moved_to_end_at: null, image_url: null, duration: null,
    tags: ['react'], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    url: 'https://alpha.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  const LINK_B: LinkWithTags = {
    id: '2', title: 'Beta', site_name: 'beta.com',
    status: 'read', is_favorite: true, deleted_at: null, moved_to_end_at: null, image_url: null, duration: null,
    tags: ['vue'], created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    url: 'https://beta.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  return { LINK_A, LINK_B }
})

const FILTER_PARAMS: LinkFilterParams = {
  textSearch: '', categoryId: null, statuses: [], tagIds: [], tagMode: 'any',
  favoritesOnly: false, sortBy: 'newest', unlockedTagIds: [],
}

vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast, dismissToast: mockDismissToast }),
}))

vi.mock('@/lib/services/links', () => ({
  toggleLinkFavorite: vi.fn(),
  deleteLink: vi.fn(),
  updateLinkStatus: vi.fn(),
  markLinkMovedToEnd: vi.fn(),
}))

const mockRefetchTags = vi.fn()
vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: mockRefetchTags }),
}))

import { toggleLinkFavorite, deleteLink, updateLinkStatus, markLinkMovedToEnd } from '@/lib/services/links'
const mockToggleFavorite = vi.mocked(toggleLinkFavorite)
const mockDeleteLink = vi.mocked(deleteLink)
const mockUpdateLinkStatus = vi.mocked(updateLinkStatus)
const mockMarkLinkMovedToEnd = vi.mocked(markLinkMovedToEnd)
const mockOnMovedToEnd = vi.fn()
const mockOnMoveUndone = vi.fn()

function useHarness(initial: LinkWithTags[] = [LINK_A, LINK_B], params: LinkFilterParams = FILTER_PARAMS) {
  const [rawLinks, setRawLinks] = useState<LinkWithTags[]>(initial)
  return { rawLinks, ...useLinkMutations(rawLinks, setRawLinks, params, { onMovedToEnd: mockOnMovedToEnd, onMoveUndone: mockOnMoveUndone }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAddToast.mockReturnValue('toast-id')
  mockToggleFavorite.mockResolvedValue(true)
  mockDeleteLink.mockResolvedValue('deleted')
  mockUpdateLinkStatus.mockResolvedValue(true)
  mockMarkLinkMovedToEnd.mockResolvedValue(true)
})

describe('useLinkMutations', () => {
  describe('handleStatusChange', () => {
    it('updates the target link status', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleStatusChange('1', 'read') })

      expect(result.current.rawLinks.find(l => l.id === '1')?.status).toBe('read')
    })

    it('leaves other links unchanged', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleStatusChange('1', 'read') })

      expect(result.current.rawLinks.find(l => l.id === '2')?.status).toBe('read')
    })

    it('calls addToast with the new status label', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleStatusChange('1', 'watching') })

      expect(mockAddToast).toHaveBeenCalledWith('Moved to Watching')
    })

    it('removes the link locally if the new status no longer matches an active status filter', async () => {
      const params: LinkFilterParams = { ...FILTER_PARAMS, statuses: ['unread'] }
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B], params))

      await act(async () => { await result.current.handleStatusChange('1', 'read') })

      expect(result.current.rawLinks.find(l => l.id === '1')).toBeUndefined()
    })

    it('saves the new status', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleStatusChange('1', 'watching') })

      expect(mockUpdateLinkStatus).toHaveBeenCalledWith('1', 'watching')
    })

    it('restores the old status and toasts on service failure', async () => {
      mockUpdateLinkStatus.mockResolvedValue(false)
      const moved = { ...LINK_B, status: 'read' as const, moved_to_end_at: '2026-01-05T00:00:00Z' }
      const { result } = renderHook(() => useHarness([LINK_A, moved]))

      await act(async () => { await result.current.handleStatusChange('2', 'unread') })

      const link = result.current.rawLinks.find(l => l.id === '2')
      expect(link?.status).toBe('read')
      expect(link?.moved_to_end_at).toBe('2026-01-05T00:00:00Z')
      expect(mockAddToast).toHaveBeenCalledWith('Failed to update status', 'destructive')
    })

    it('clears moved_to_end_at locally when changing to unread', async () => {
      const moved = { ...LINK_B, status: 'read' as const, moved_to_end_at: '2026-01-05T00:00:00Z' }
      const { result } = renderHook(() => useHarness([LINK_A, moved]))

      await act(async () => { await result.current.handleStatusChange('2', 'unread') })

      expect(result.current.rawLinks.find(l => l.id === '2')?.moved_to_end_at).toBeNull()
    })

    it('keeps moved_to_end_at when changing to a status other than unread', async () => {
      const moved = { ...LINK_B, status: 'read' as const, moved_to_end_at: '2026-01-05T00:00:00Z' }
      const { result } = renderHook(() => useHarness([LINK_A, moved]))

      await act(async () => { await result.current.handleStatusChange('2', 'archived') })

      expect(result.current.rawLinks.find(l => l.id === '2')?.moved_to_end_at).toBe('2026-01-05T00:00:00Z')
    })
  })

  describe('handleEdit', () => {
    it('replaces the edited link in the list', () => {
      const { result } = renderHook(() => useHarness())
      const updated = { ...LINK_A, title: 'Updated Title' }

      act(() => result.current.handleEdit(updated))

      expect(result.current.rawLinks.find(l => l.id === '1')?.title).toBe('Updated Title')
    })

    it('calls addToast on save', () => {
      const { result } = renderHook(() => useHarness())

      act(() => result.current.handleEdit(LINK_A))

      expect(mockAddToast).toHaveBeenCalledWith('Changes saved')
    })

    it('refetches the shared tags cache, since editing can create new tags', () => {
      const { result } = renderHook(() => useHarness())

      act(() => result.current.handleEdit(LINK_A))

      expect(mockRefetchTags).toHaveBeenCalledOnce()
    })
  })

  describe('handleDelete', () => {
    afterEach(() => vi.useRealTimers())

    function setupWithFakeTimers() {
      const utils = renderHook(() => useHarness())
      vi.useFakeTimers()
      return utils
    }

    it('removes the link optimistically before the delay', () => {
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      expect(result.current.rawLinks.find(l => l.id === '1')).toBeUndefined()
    })

    it('leaves other links untouched', () => {
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      expect(result.current.rawLinks).toHaveLength(1)
      expect(result.current.rawLinks[0].id).toBe('2')
    })

    it('shows undo toast immediately with correct args', () => {
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      expect(mockAddToast).toHaveBeenCalledWith(
        'Link deleted, tap to undo',
        'destructive',
        expect.objectContaining({ duration: 3000, onClick: expect.any(Function) }),
      )
    })

    it('does not call deleteLink before 2s', () => {
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      expect(mockDeleteLink).not.toHaveBeenCalled()
    })

    it('calls deleteLink with the correct id after 2s', async () => {
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(mockDeleteLink).toHaveBeenCalledWith('1')
    })

    it('rolls back the optimistic removal on service failure', async () => {
      mockDeleteLink.mockResolvedValue('error')
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(result.current.rawLinks.some(l => l.id === '1')).toBe(true)
    })

    it('toasts an error on service failure', async () => {
      mockDeleteLink.mockResolvedValue('error')
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(mockAddToast).toHaveBeenCalledWith('Failed to delete link', 'destructive')
    })

    it('cancels the delete when undo is tapped', async () => {
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      const { onClick } = mockAddToast.mock.calls[0][2]
      act(() => onClick())
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(mockDeleteLink).not.toHaveBeenCalled()
    })

    it('restores the link when undo is tapped', () => {
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      const { onClick } = mockAddToast.mock.calls[0][2]
      act(() => onClick())
      expect(result.current.rawLinks.find(l => l.id === '1')).toBeDefined()
    })

    it('refuses to delete a favorited link immediately, without starting the undo timer', () => {
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('2'))
      expect(result.current.rawLinks.some(l => l.id === '2')).toBe(true)
      expect(mockAddToast).toHaveBeenCalledWith('Unfavorite to delete', 'destructive')
      expect(mockDeleteLink).not.toHaveBeenCalled()
    })

    it('does not show the undo toast for a favorited link', () => {
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('2'))
      expect(mockAddToast).not.toHaveBeenCalledWith('Link deleted, tap to undo', expect.anything(), expect.anything())
    })

    it('restores the card and toasts when the deferred delete resolves "blocked"', async () => {
      mockDeleteLink.mockResolvedValue('blocked')
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(result.current.rawLinks.some(l => l.id === '1')).toBe(true)
      expect(mockAddToast).toHaveBeenCalledWith('Unfavorite to delete', 'destructive')
    })
  })

  describe('handleFavoriteToggle', () => {
    it('toggles is_favorite from false to true', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(result.current.rawLinks.find(l => l.id === '1')?.is_favorite).toBe(true)
    })

    it('toggles is_favorite from true to false', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleFavoriteToggle('2') })

      expect(result.current.rawLinks.find(l => l.id === '2')?.is_favorite).toBe(false)
    })

    it('calls toggleLinkFavorite with the new value', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(mockToggleFavorite).toHaveBeenCalledWith('1', true)
    })

    it('toasts "Added to favorites" when not yet favorited', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(mockAddToast).toHaveBeenCalledWith('Added to favorites')
    })

    it('toasts "Removed from favorites" when already favorited', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleFavoriteToggle('2') })

      expect(mockAddToast).toHaveBeenCalledWith('Removed from favorites')
    })

    it('rolls back optimistic update on service failure', async () => {
      mockToggleFavorite.mockResolvedValue(false)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(result.current.rawLinks.find(l => l.id === '1')?.is_favorite).toBe(false)
    })

    it('toasts an error on service failure', async () => {
      mockToggleFavorite.mockResolvedValue(false)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to update favorite', 'destructive')
    })

    it('removes the link locally if favoritesOnly is active and it becomes unfavorited', async () => {
      const params: LinkFilterParams = { ...FILTER_PARAMS, favoritesOnly: true }
      const { result } = renderHook(() => useHarness([LINK_B], params))

      await act(async () => { await result.current.handleFavoriteToggle('2') })

      expect(result.current.rawLinks.find(l => l.id === '2')).toBeUndefined()
    })
  })

  describe('handleMoveToEnd', () => {
    const LINK_C: LinkWithTags = { ...LINK_A, id: '3', title: 'Gamma' }

    it('moves a middle link to the end and saves the move', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))

      await act(async () => { await result.current.handleMoveToEnd('2') })

      expect(result.current.rawLinks.map(l => l.id)).toEqual(['1', '3', '2'])
      const movedAt = result.current.rawLinks[2].moved_to_end_at
      expect(movedAt).not.toBeNull()
      expect(mockMarkLinkMovedToEnd).toHaveBeenCalledWith('2', movedAt)
    })

    it('does nothing for an id not in the list', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))

      await act(async () => { await result.current.handleMoveToEnd('99') })

      expect(result.current.rawLinks.map(l => l.id)).toEqual(['1', '2', '3'])
      expect(mockMarkLinkMovedToEnd).not.toHaveBeenCalled()
      expect(mockOnMovedToEnd).not.toHaveBeenCalled()
    })

    it('restores the position and old moved_to_end_at, and toasts, on service failure', async () => {
      mockMarkLinkMovedToEnd.mockResolvedValue(false)
      const previouslyMoved = { ...LINK_B, moved_to_end_at: '2026-01-05T00:00:00Z' }
      const { result } = renderHook(() => useHarness([LINK_A, previouslyMoved, LINK_C]))

      await act(async () => { await result.current.handleMoveToEnd('2') })

      expect(result.current.rawLinks.map(l => l.id)).toEqual(['1', '2', '3'])
      expect(result.current.rawLinks[1].moved_to_end_at).toBe('2026-01-05T00:00:00Z')
      expect(mockAddToast).toHaveBeenCalledWith('Failed to move link', 'destructive')
    })

    it('calls onMovedToEnd only when the save succeeds', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))

      await act(async () => { await result.current.handleMoveToEnd('1') })
      expect(mockOnMovedToEnd).toHaveBeenCalledOnce()

      mockMarkLinkMovedToEnd.mockResolvedValue(false)
      await act(async () => { await result.current.handleMoveToEnd('3') })
      expect(mockOnMovedToEnd).toHaveBeenCalledOnce()
    })

    it('shows no toast on success', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))

      await act(async () => { await result.current.handleMoveToEnd('2') })

      expect(mockAddToast).not.toHaveBeenCalled()
    })

    it('records the last move with its old index and old moved_to_end_at', async () => {
      const previouslyMoved = { ...LINK_B, moved_to_end_at: '2026-01-05T00:00:00Z' }
      const { result } = renderHook(() => useHarness([LINK_A, previouslyMoved, LINK_C]))
      expect(result.current.lastMove).toBeNull()

      await act(async () => { await result.current.handleMoveToEnd('2') })

      expect(result.current.lastMove).toEqual({
        id: '2',
        index: 1,
        previousMovedAt: '2026-01-05T00:00:00Z',
        movedAt: result.current.rawLinks[2].moved_to_end_at,
      })
    })

    it('leaves lastMove empty when the save fails', async () => {
      mockMarkLinkMovedToEnd.mockResolvedValue(false)
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))

      await act(async () => { await result.current.handleMoveToEnd('2') })

      expect(result.current.lastMove).toBeNull()
    })

    it('replaces lastMove with a newer move', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))

      await act(async () => { await result.current.handleMoveToEnd('1') })
      await act(async () => { await result.current.handleMoveToEnd('3') })

      expect(result.current.lastMove).toMatchObject({ id: '3', index: 1, previousMovedAt: null })
    })

    it('clearLastMove empties the slot', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))
      await act(async () => { await result.current.handleMoveToEnd('1') })

      act(() => result.current.clearLastMove())

      expect(result.current.lastMove).toBeNull()
    })
  })

  describe('handleUndoMove', () => {
    const LINK_C: LinkWithTags = { ...LINK_A, id: '3', title: 'Gamma' }

    it('puts a never-moved link back at its old index and saves null', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))
      await act(async () => { await result.current.handleMoveToEnd('1') })
      expect(result.current.rawLinks.map(l => l.id)).toEqual(['2', '3', '1'])

      let ok: boolean | undefined
      await act(async () => { ok = await result.current.handleUndoMove() })

      expect(ok).toBe(true)
      expect(result.current.rawLinks.map(l => l.id)).toEqual(['1', '2', '3'])
      expect(result.current.rawLinks[0].moved_to_end_at).toBeNull()
      expect(mockMarkLinkMovedToEnd).toHaveBeenLastCalledWith('1', null)
    })

    it('restores an earlier moved_to_end_at for a link moved before', async () => {
      const previouslyMoved = { ...LINK_B, moved_to_end_at: '2026-01-05T00:00:00Z' }
      const { result } = renderHook(() => useHarness([LINK_A, previouslyMoved, LINK_C]))
      await act(async () => { await result.current.handleMoveToEnd('2') })

      await act(async () => { await result.current.handleUndoMove() })

      expect(result.current.rawLinks.map(l => l.id)).toEqual(['1', '2', '3'])
      expect(result.current.rawLinks[1].moved_to_end_at).toBe('2026-01-05T00:00:00Z')
      expect(mockMarkLinkMovedToEnd).toHaveBeenLastCalledWith('2', '2026-01-05T00:00:00Z')
    })

    it('clears lastMove and calls onMoveUndone on success, with no toast', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))
      await act(async () => { await result.current.handleMoveToEnd('1') })

      await act(async () => { await result.current.handleUndoMove() })

      expect(result.current.lastMove).toBeNull()
      expect(mockOnMoveUndone).toHaveBeenCalledOnce()
      expect(mockAddToast).not.toHaveBeenCalled()
      expect(result.current.undoingMove).toBe(false)
    })

    it('puts the link back at the end, keeps lastMove and toasts on failure', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))
      await act(async () => { await result.current.handleMoveToEnd('1') })
      const movedAt = result.current.rawLinks[2].moved_to_end_at
      mockMarkLinkMovedToEnd.mockResolvedValue(false)

      let ok: boolean | undefined
      await act(async () => { ok = await result.current.handleUndoMove() })

      expect(ok).toBe(false)
      expect(result.current.rawLinks.map(l => l.id)).toEqual(['2', '3', '1'])
      expect(result.current.rawLinks[2].moved_to_end_at).toBe(movedAt)
      expect(result.current.lastMove).toMatchObject({ id: '1' })
      expect(mockOnMoveUndone).not.toHaveBeenCalled()
      expect(mockAddToast).toHaveBeenCalledWith('Failed to undo move', 'destructive')
      expect(result.current.undoingMove).toBe(false)
    })

    it('does nothing without a lastMove', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))

      let ok: boolean | undefined
      await act(async () => { ok = await result.current.handleUndoMove() })

      expect(ok).toBe(false)
      expect(mockMarkLinkMovedToEnd).not.toHaveBeenCalled()
    })

    it('saves only once on a double press', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))
      await act(async () => { await result.current.handleMoveToEnd('1') })
      mockMarkLinkMovedToEnd.mockClear()

      await act(async () => {
        await Promise.all([result.current.handleUndoMove(), result.current.handleUndoMove()])
      })

      expect(mockMarkLinkMovedToEnd).toHaveBeenCalledOnce()
    })
  })

  describe('handleCreate', () => {
    it('prepends the new link to the list', () => {
      const { result } = renderHook(() => useHarness())
      const newLink = { ...LINK_A, id: '99', title: 'New' }

      act(() => result.current.handleCreate(newLink))

      expect(result.current.rawLinks[0].id).toBe('99')
      expect(result.current.rawLinks).toHaveLength(3)
    })

    it('refetches the shared tags cache, since creating can add new tags', () => {
      const { result } = renderHook(() => useHarness())
      const newLink = { ...LINK_A, id: '99', title: 'New' }

      act(() => result.current.handleCreate(newLink))

      expect(mockRefetchTags).toHaveBeenCalledOnce()
    })

    it('does not add the new link locally if it does not match the active filter', () => {
      const params: LinkFilterParams = { ...FILTER_PARAMS, categoryId: 'cat-1' }
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B], params))
      const newLink = { ...LINK_A, id: '99', title: 'New', category_id: 'cat-2' }

      act(() => result.current.handleCreate(newLink))

      expect(result.current.rawLinks.find(l => l.id === '99')).toBeUndefined()
    })
  })
})
