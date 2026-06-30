// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFavorites } from '@/lib/hooks/links/useFavorites'
import type { LinkWithTags } from '@/lib/services/links'

const mockAddToast = vi.fn()
const mockDismissToast = vi.fn()

const { LINK_A, LINK_B, LINK_PRIVATE } = vi.hoisted(() => {
  const LINK_A: LinkWithTags = {
    id: '1', title: 'Alpha', site_name: 'alpha.com',
    status: 'unread', is_favorite: true, deleted_at: null, image_url: null,
    tags: ['react'], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    url: 'https://alpha.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  const LINK_B: LinkWithTags = {
    id: '2', title: 'Beta', site_name: 'beta.com',
    status: 'read', is_favorite: true, deleted_at: null, image_url: null,
    tags: ['vue'], created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    url: 'https://beta.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  const LINK_PRIVATE: LinkWithTags = {
    id: '3', title: 'Secret', site_name: 'secret.com',
    status: 'unread', is_favorite: true, deleted_at: null, image_url: null,
    tags: ['private-stuff'], created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z',
    url: 'https://secret.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  return { LINK_A, LINK_B, LINK_PRIVATE }
})

vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast, dismissToast: mockDismissToast }),
}))

vi.mock('@/lib/services/favorites', () => ({
  getFavorites: vi.fn(),
}))

vi.mock('@/lib/services/links', () => ({
  toggleLinkFavorite: vi.fn(),
  deleteLink: vi.fn(),
}))

vi.mock('@/lib/services/tags', () => ({
  getPrivateTagNames: vi.fn(),
  isTagVisible: (isPrivate: boolean, name: string, unlockedTagNames: Set<string>) =>
    !isPrivate || unlockedTagNames.has(name),
}))

const mockUseUnlockedTags = vi.fn()
vi.mock('@/lib/context/UnlockedTagsContext', () => ({
  useUnlockedTags: () => mockUseUnlockedTags(),
}))

const mockRefetchTags = vi.fn()
vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: mockRefetchTags }),
}))

import { getFavorites } from '@/lib/services/favorites'
import { toggleLinkFavorite, deleteLink } from '@/lib/services/links'
import { getPrivateTagNames } from '@/lib/services/tags'
const mockGetFavorites = vi.mocked(getFavorites)
const mockToggleFavorite = vi.mocked(toggleLinkFavorite)
const mockDeleteLink = vi.mocked(deleteLink)
const mockGetPrivateTagNames = vi.mocked(getPrivateTagNames)

beforeEach(() => {
  vi.clearAllMocks()
  mockAddToast.mockReturnValue('toast-id')
  mockGetFavorites.mockResolvedValue([LINK_A, LINK_B])
  mockGetPrivateTagNames.mockResolvedValue([])
  mockToggleFavorite.mockResolvedValue(true)
  mockDeleteLink.mockResolvedValue(true)
  mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
})

async function renderLoaded() {
  const utils = renderHook(() => useFavorites())
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useFavorites', () => {
  describe('initial state', () => {
    it('starts in loading state with no links', () => {
      const { result } = renderHook(() => useFavorites())
      expect(result.current.loading).toBe(true)
      expect(result.current.links).toHaveLength(0)
    })

    it('loads favorites from the service and clears loading', async () => {
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
      expect(result.current.loading).toBe(false)
    })
  })

  describe('privacy filtering', () => {
    it('shows all favorites when there are no private tags', async () => {
      mockGetFavorites.mockResolvedValue([LINK_A, LINK_B])
      mockGetPrivateTagNames.mockResolvedValue([])
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
    })

    it('hides a favorite whose tag is private and locked', async () => {
      mockGetFavorites.mockResolvedValue([LINK_A, LINK_PRIVATE])
      mockGetPrivateTagNames.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(1)
      expect(result.current.links[0].id).toBe('1')
    })

    it('shows a favorite whose private tag has been unlocked', async () => {
      mockGetFavorites.mockResolvedValue([LINK_A, LINK_PRIVATE])
      mockGetPrivateTagNames.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(['private-stuff']), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
    })
  })

  describe('handleStatusChange', () => {
    it('updates the target link status', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleStatusChange('1', 'read'))

      expect(result.current.links.find(l => l.id === '1')?.status).toBe('read')
    })

    it('leaves other links unchanged', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleStatusChange('1', 'read'))

      expect(result.current.links.find(l => l.id === '2')?.status).toBe('read')
    })

    it('calls addToast with the new status label', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleStatusChange('1', 'watching'))

      expect(mockAddToast).toHaveBeenCalledWith('Moved to Watching')
    })
  })

  describe('handleEdit', () => {
    it('replaces the edited link in the list', async () => {
      const { result } = await renderLoaded()
      const updated = { ...LINK_A, title: 'Updated Title' }

      act(() => result.current.handleEdit(updated))

      expect(result.current.links.find(l => l.id === '1')?.title).toBe('Updated Title')
    })

    it('calls addToast on save', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleEdit(LINK_A))

      expect(mockAddToast).toHaveBeenCalledWith('Changes saved')
    })

    it('refetches the shared tags cache, since editing can create new tags', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleEdit(LINK_A))

      expect(mockRefetchTags).toHaveBeenCalledOnce()
    })
  })

  describe('handleDelete', () => {
    afterEach(() => vi.useRealTimers())

    async function setupWithFakeTimers() {
      const utils = await renderLoaded()
      vi.useFakeTimers()
      return utils
    }

    it('removes the link optimistically before the delay', async () => {
      const { result } = await setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      expect(result.current.links.find(l => l.id === '1')).toBeUndefined()
    })

    it('leaves other links untouched', async () => {
      const { result } = await setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      expect(result.current.links).toHaveLength(1)
      expect(result.current.links[0].id).toBe('2')
    })

    it('shows undo toast immediately with correct args', async () => {
      const { result } = await setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      expect(mockAddToast).toHaveBeenCalledWith(
        'Link deleted, tap to undo',
        'destructive',
        expect.objectContaining({ duration: 3000, onClick: expect.any(Function) }),
      )
    })

    it('does not call deleteLink before 2s', async () => {
      const { result } = await setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      expect(mockDeleteLink).not.toHaveBeenCalled()
    })

    it('calls deleteLink with the correct id after 2s', async () => {
      const { result } = await setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(mockDeleteLink).toHaveBeenCalledWith('1')
    })

    it('rolls back the optimistic removal on service failure', async () => {
      mockDeleteLink.mockResolvedValue(false)
      const { result } = await setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(result.current.links.find(l => l.id === '1')).toBeDefined()
    })

    it('toasts an error on service failure', async () => {
      mockDeleteLink.mockResolvedValue(false)
      const { result } = await setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(mockAddToast).toHaveBeenCalledWith('Failed to delete link', 'destructive')
    })

    it('cancels the delete when undo is tapped', async () => {
      const { result } = await setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      const { onClick } = mockAddToast.mock.calls[0][2]
      act(() => onClick())
      await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
      expect(mockDeleteLink).not.toHaveBeenCalled()
    })

    it('restores the link when undo is tapped', async () => {
      const { result } = await setupWithFakeTimers()
      act(() => result.current.handleDelete('1'))
      const { onClick } = mockAddToast.mock.calls[0][2]
      act(() => onClick())
      expect(result.current.links.find(l => l.id === '1')).toBeDefined()
    })
  })

  describe('handleFavoriteToggle', () => {
    it('removes the link from the list optimistically', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(result.current.links.find(l => l.id === '1')).toBeUndefined()
    })

    it('calls toggleLinkFavorite with false', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(mockToggleFavorite).toHaveBeenCalledWith('1', false)
    })

    it('toasts "Removed from favorites" on success', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(mockAddToast).toHaveBeenCalledWith('Removed from favorites')
    })

    it('rolls back the optimistic removal on service failure', async () => {
      mockToggleFavorite.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(result.current.links.find(l => l.id === '1')).toBeDefined()
    })

    it('toasts an error on service failure', async () => {
      mockToggleFavorite.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to remove from favorites', 'destructive')
    })

    it('does nothing when the link id is not found', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('999') })

      expect(mockToggleFavorite).not.toHaveBeenCalled()
      expect(result.current.links).toHaveLength(2)
    })
  })
})
