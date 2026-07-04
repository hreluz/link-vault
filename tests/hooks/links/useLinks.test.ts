// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLinks } from '@/lib/hooks/links/useLinks'
import type { LinkWithTags, LinkFilterParams } from '@/lib/services/links'

const mockAddToast = vi.fn()
const mockDismissToast = vi.fn()

const { LINK_A, LINK_B, LINK_PRIVATE } = vi.hoisted(() => {
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
  const LINK_PRIVATE: LinkWithTags = {
    id: '3', title: 'Secret', site_name: 'secret.com',
    status: 'unread', is_favorite: false, deleted_at: null, image_url: null, duration: null,
    tags: ['private-stuff'], created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z',
    url: 'https://secret.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  return { LINK_A, LINK_B, LINK_PRIVATE }
})

const FILTER_PARAMS: LinkFilterParams = {
  search: '', categoryId: null, statuses: [], tagNames: [], tagMode: 'any',
  favoritesOnly: false, sortBy: 'newest', unlockedTagNames: [],
}

vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast, dismissToast: mockDismissToast }),
}))

vi.mock('@/lib/services/links', () => ({
  getLinksPage: vi.fn(),
  toggleLinkFavorite: vi.fn(),
  deleteLink: vi.fn(),
  bulkUpdateStatus: vi.fn(),
  bulkSoftDelete: vi.fn(),
  bulkUpdateCategory: vi.fn(),
  bulkAddTags: vi.fn(),
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

import {
  getLinksPage, toggleLinkFavorite, deleteLink,
  bulkUpdateStatus, bulkSoftDelete, bulkUpdateCategory, bulkAddTags,
} from '@/lib/services/links'
import { getPrivateTagNames } from '@/lib/services/tags'
const mockGetLinksPage = vi.mocked(getLinksPage)
const mockToggleFavorite = vi.mocked(toggleLinkFavorite)
const mockDeleteLink = vi.mocked(deleteLink)
const mockGetPrivateTagNames = vi.mocked(getPrivateTagNames)
const mockBulkUpdateStatus = vi.mocked(bulkUpdateStatus)
const mockBulkSoftDelete = vi.mocked(bulkSoftDelete)
const mockBulkUpdateCategory = vi.mocked(bulkUpdateCategory)
const mockBulkAddTags = vi.mocked(bulkAddTags)

beforeEach(() => {
  vi.clearAllMocks()
  mockAddToast.mockReturnValue('toast-id')
  mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 2 })
  mockGetPrivateTagNames.mockResolvedValue([])
  mockToggleFavorite.mockResolvedValue(true)
  mockDeleteLink.mockResolvedValue(true)
  mockBulkUpdateStatus.mockResolvedValue(true)
  mockBulkSoftDelete.mockResolvedValue(true)
  mockBulkUpdateCategory.mockResolvedValue(true)
  mockBulkAddTags.mockResolvedValue(true)
  mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
})

async function renderLoaded(params: LinkFilterParams = FILTER_PARAMS) {
  const utils = renderHook(() => useLinks(params))
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useLinks', () => {
  describe('initial state', () => {
    it('starts in loading state with no links', () => {
      const { result } = renderHook(() => useLinks(FILTER_PARAMS))
      expect(result.current.loading).toBe(true)
      expect(result.current.links).toHaveLength(0)
    })

    it('loads links from the service and clears loading', async () => {
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
      expect(result.current.loading).toBe(false)
    })

    it('fetches the first page with the given filter params', async () => {
      await renderLoaded()
      expect(mockGetLinksPage).toHaveBeenCalledWith(FILTER_PARAMS, 40, 0)
    })

    it('exposes totalCount and hasMore from the service response', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 50 })
      const { result } = await renderLoaded()
      expect(result.current.totalCount).toBe(50)
      expect(result.current.hasMore).toBe(true)
    })
  })

  describe('loadMore', () => {
    it('fetches the next page at the current offset and appends it', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A], totalCount: 2 })
      const { result } = await renderLoaded()

      mockGetLinksPage.mockResolvedValue({ links: [LINK_B], totalCount: 2 })
      await act(async () => { result.current.loadMore() })

      expect(mockGetLinksPage).toHaveBeenLastCalledWith(FILTER_PARAMS, 40, 1)
      expect(result.current.links.map(l => l.id)).toEqual(['1', '2'])
      expect(result.current.hasMore).toBe(false)
    })
  })

  describe('privacy filtering', () => {
    it('shows all links when there are no private tags', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 2 })
      mockGetPrivateTagNames.mockResolvedValue([])
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
    })

    it('hides a link whose tag is private and locked', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_PRIVATE], totalCount: 2 })
      mockGetPrivateTagNames.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(1)
      expect(result.current.links[0].id).toBe('1')
    })

    it('shows a link whose private tag has been unlocked', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_PRIVATE], totalCount: 2 })
      mockGetPrivateTagNames.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(['private-stuff']), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
    })

    it('hides a link that has both a public and a locked private tag', async () => {
      const mixedLink: LinkWithTags = { ...LINK_A, id: '5', tags: ['react', 'private-stuff'] }
      mockGetLinksPage.mockResolvedValue({ links: [mixedLink], totalCount: 1 })
      mockGetPrivateTagNames.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(0)
    })

    it('shows all links once all private tags are unlocked', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B, LINK_PRIVATE], totalCount: 3 })
      mockGetPrivateTagNames.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(['private-stuff']), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(3)
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

    it('removes the link locally if the new status no longer matches an active status filter', async () => {
      const params: LinkFilterParams = { ...FILTER_PARAMS, statuses: ['unread'] }
      const { result } = await renderLoaded(params)

      act(() => result.current.handleStatusChange('1', 'read'))

      expect(result.current.links.find(l => l.id === '1')).toBeUndefined()
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
      expect(result.current.links.some(l => l.id === '1')).toBe(true)
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
    it('toggles is_favorite from false to true', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(result.current.links.find(l => l.id === '1')?.is_favorite).toBe(true)
    })

    it('toggles is_favorite from true to false', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('2') })

      expect(result.current.links.find(l => l.id === '2')?.is_favorite).toBe(false)
    })

    it('calls toggleLinkFavorite with the new value', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(mockToggleFavorite).toHaveBeenCalledWith('1', true)
    })

    it('toasts "Added to favorites" when not yet favorited', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(mockAddToast).toHaveBeenCalledWith('Added to favorites')
    })

    it('toasts "Removed from favorites" when already favorited', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('2') })

      expect(mockAddToast).toHaveBeenCalledWith('Removed from favorites')
    })

    it('rolls back optimistic update on service failure', async () => {
      mockToggleFavorite.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(result.current.links.find(l => l.id === '1')?.is_favorite).toBe(false)
    })

    it('toasts an error on service failure', async () => {
      mockToggleFavorite.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleFavoriteToggle('1') })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to update favorite', 'destructive')
    })

    it('removes the link locally if favoritesOnly is active and it becomes unfavorited', async () => {
      const params: LinkFilterParams = { ...FILTER_PARAMS, favoritesOnly: true }
      mockGetLinksPage.mockResolvedValue({ links: [LINK_B], totalCount: 1 })
      const { result } = await renderLoaded(params)

      await act(async () => { await result.current.handleFavoriteToggle('2') })

      expect(result.current.links.find(l => l.id === '2')).toBeUndefined()
    })
  })

  describe('handleCreate', () => {
    it('prepends the new link to the list', async () => {
      const { result } = await renderLoaded()
      const newLink = { ...LINK_A, id: '99', title: 'New' }

      act(() => result.current.handleCreate(newLink))

      expect(result.current.links[0].id).toBe('99')
      expect(result.current.links).toHaveLength(3)
    })

    it('refetches the shared tags cache, since creating can add new tags', async () => {
      const { result } = await renderLoaded()
      const newLink = { ...LINK_A, id: '99', title: 'New' }

      act(() => result.current.handleCreate(newLink))

      expect(mockRefetchTags).toHaveBeenCalledOnce()
    })

    it('does not add the new link locally if it does not match the active filter', async () => {
      const params: LinkFilterParams = { ...FILTER_PARAMS, categoryId: 'cat-1' }
      const { result } = await renderLoaded(params)
      const newLink = { ...LINK_A, id: '99', title: 'New', category_id: 'cat-2' }

      act(() => result.current.handleCreate(newLink))

      expect(result.current.links.find(l => l.id === '99')).toBeUndefined()
    })
  })

  describe('handleBulkStatusChange', () => {
    it('updates status for all matching links immediately', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkStatusChange(['1', '2'], 'archived') })

      expect(result.current.links.find(l => l.id === '1')?.status).toBe('archived')
      expect(result.current.links.find(l => l.id === '2')?.status).toBe('archived')
    })

    it('leaves non-matching links unchanged', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B, { ...LINK_PRIVATE, id: '3', status: 'unread' as const }], totalCount: 3 })
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkStatusChange(['1'], 'archived') })

      expect(result.current.links.find(l => l.id === '2')?.status).toBe('read')
      expect(result.current.links.find(l => l.id === '3')?.status).toBe('unread')
    })

    it('calls bulkUpdateStatus with correct ids and status', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkStatusChange(['1', '2'], 'archived') })

      expect(mockBulkUpdateStatus).toHaveBeenCalledWith(['1', '2'], 'archived')
    })

    it('rolls back all statuses on service failure', async () => {
      mockBulkUpdateStatus.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkStatusChange(['1', '2'], 'archived') })

      expect(result.current.links.find(l => l.id === '1')?.status).toBe('unread')
      expect(result.current.links.find(l => l.id === '2')?.status).toBe('read')
    })

    it('toasts an error on failure', async () => {
      mockBulkUpdateStatus.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkStatusChange(['1'], 'archived') })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to update links', 'destructive')
    })
  })

  describe('handleBulkDelete', () => {
    it('removes all matching links immediately', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkDelete(['1', '2']) })

      expect(result.current.links).toHaveLength(0)
    })

    it('leaves non-matching links in place', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkDelete(['1']) })

      expect(result.current.links).toHaveLength(1)
      expect(result.current.links[0].id).toBe('2')
    })

    it('calls bulkSoftDelete immediately (no undo timer)', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkDelete(['1']) })

      expect(mockBulkSoftDelete).toHaveBeenCalledWith(['1'])
    })

    it('toasts a success message with the correct count', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkDelete(['1', '2']) })

      expect(mockAddToast).toHaveBeenCalledWith('2 links deleted')
    })

    it('uses singular "link" when deleting one', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkDelete(['1']) })

      expect(mockAddToast).toHaveBeenCalledWith('1 link deleted')
    })

    it('restores all links on service failure', async () => {
      mockBulkSoftDelete.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkDelete(['1', '2']) })

      expect(result.current.links).toHaveLength(2)
    })

    it('toasts an error on failure', async () => {
      mockBulkSoftDelete.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkDelete(['1']) })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to delete links', 'destructive')
    })
  })

  describe('handleBulkCategoryChange', () => {
    it('updates category_id for all matching links immediately', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkCategoryChange(['1', '2'], 'cat-new') })

      expect(result.current.links.find(l => l.id === '1')?.category_id).toBe('cat-new')
      expect(result.current.links.find(l => l.id === '2')?.category_id).toBe('cat-new')
    })

    it('calls bulkUpdateCategory with correct ids and categoryId', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkCategoryChange(['1'], 'cat-xyz') })

      expect(mockBulkUpdateCategory).toHaveBeenCalledWith(['1'], 'cat-xyz')
    })

    it('rolls back category_id on service failure', async () => {
      mockBulkUpdateCategory.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkCategoryChange(['1'], 'cat-new') })

      expect(result.current.links.find(l => l.id === '1')?.category_id).toBeNull()
    })

    it('toasts an error on failure', async () => {
      mockBulkUpdateCategory.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkCategoryChange(['1'], 'cat-new') })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to update category', 'destructive')
    })
  })

  describe('handleBulkAddTags', () => {
    it('appends new tags to all matching links', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkAddTags(['1', '2'], ['ts', 'node']) })

      expect(result.current.links.find(l => l.id === '1')?.tags).toContain('ts')
      expect(result.current.links.find(l => l.id === '2')?.tags).toContain('ts')
    })

    it('preserves existing tags', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['ts']) })

      expect(result.current.links.find(l => l.id === '1')?.tags).toContain('react')
    })

    it('deduplicates tags when the link already has the tag', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['react']) })

      const tags = result.current.links.find(l => l.id === '1')?.tags ?? []
      expect(tags.filter(t => t === 'react')).toHaveLength(1)
    })

    it('calls bulkAddTags with correct ids and tag names', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkAddTags(['1', '2'], ['node']) })

      expect(mockBulkAddTags).toHaveBeenCalledWith(['1', '2'], ['node'])
    })

    it('refetches the shared tags cache on success', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['new-tag']) })

      expect(mockRefetchTags).toHaveBeenCalledOnce()
    })

    it('does not refetch the shared tags cache on failure', async () => {
      mockBulkAddTags.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['new-tag']) })

      expect(mockRefetchTags).not.toHaveBeenCalled()
    })

    it('rolls back tags on service failure', async () => {
      mockBulkAddTags.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['new-tag']) })

      expect(result.current.links.find(l => l.id === '1')?.tags).not.toContain('new-tag')
    })

    it('toasts an error on failure', async () => {
      mockBulkAddTags.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['new-tag']) })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to add tags', 'destructive')
    })
  })
})
