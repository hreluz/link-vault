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
    status: 'unread', is_favorite: false, deleted_at: null, image_url: null, duration: null,
    tags: ['react'], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    url: 'https://alpha.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  const LINK_B: LinkWithTags = {
    id: '2', title: 'Beta', site_name: 'beta.com',
    status: 'read', is_favorite: true, deleted_at: null, image_url: null, duration: null,
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
}))

const mockRefetchTags = vi.fn()
vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: mockRefetchTags }),
}))

import { toggleLinkFavorite, deleteLink } from '@/lib/services/links'
const mockToggleFavorite = vi.mocked(toggleLinkFavorite)
const mockDeleteLink = vi.mocked(deleteLink)

function useHarness(initial: LinkWithTags[] = [LINK_A, LINK_B], params: LinkFilterParams = FILTER_PARAMS) {
  const [rawLinks, setRawLinks] = useState<LinkWithTags[]>(initial)
  return { rawLinks, ...useLinkMutations(rawLinks, setRawLinks, params) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAddToast.mockReturnValue('toast-id')
  mockToggleFavorite.mockResolvedValue(true)
  mockDeleteLink.mockResolvedValue(true)
})

describe('useLinkMutations', () => {
  describe('handleStatusChange', () => {
    it('updates the target link status', () => {
      const { result } = renderHook(() => useHarness())

      act(() => result.current.handleStatusChange('1', 'read'))

      expect(result.current.rawLinks.find(l => l.id === '1')?.status).toBe('read')
    })

    it('leaves other links unchanged', () => {
      const { result } = renderHook(() => useHarness())

      act(() => result.current.handleStatusChange('1', 'read'))

      expect(result.current.rawLinks.find(l => l.id === '2')?.status).toBe('read')
    })

    it('calls addToast with the new status label', () => {
      const { result } = renderHook(() => useHarness())

      act(() => result.current.handleStatusChange('1', 'watching'))

      expect(mockAddToast).toHaveBeenCalledWith('Moved to Watching')
    })

    it('removes the link locally if the new status no longer matches an active status filter', () => {
      const params: LinkFilterParams = { ...FILTER_PARAMS, statuses: ['unread'] }
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B], params))

      act(() => result.current.handleStatusChange('1', 'read'))

      expect(result.current.rawLinks.find(l => l.id === '1')).toBeUndefined()
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
      mockDeleteLink.mockResolvedValue(false)
      const { result } = setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(result.current.rawLinks.some(l => l.id === '1')).toBe(true)
    })

    it('toasts an error on service failure', async () => {
      mockDeleteLink.mockResolvedValue(false)
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
