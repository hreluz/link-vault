// @vitest-environment jsdom
// Integration tests for useLinkList — verifies the composition of the sub-hooks.
// Detailed behavior is covered in useLinks, useLinkFilters, and useLinkModals tests.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLinkList } from '@/lib/hooks/links/list/useLinkList'
import type { LinkWithTags, LinkFilterParams } from '@/lib/services/links'

const mockAddToast = vi.fn()
const mockRefetchTags = vi.fn()

const { LINK_A, LINK_B, LINK_C } = vi.hoisted(() => {
  const base = { user_id: 'user-1', description: '', notes: null, image_url: null, deleted_at: null, moved_to_end_at: null, duration: null }
  const LINK_A: LinkWithTags = {
    ...base, id: '1', title: 'Alpha Article', site_name: 'alpha.com',
    category_id: 'cat-article', status: 'unread', is_favorite: false,
    tags: ['react'], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    url: 'https://alpha.com',
  }
  const LINK_B: LinkWithTags = {
    ...base, id: '2', title: 'Beta Video', site_name: 'beta.com',
    category_id: 'cat-youtube', status: 'read', is_favorite: true,
    tags: ['vue', 'css'], created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    url: 'https://beta.com',
  }
  const LINK_C: LinkWithTags = {
    ...base, id: '3', title: 'Gamma Article', site_name: 'gamma.com',
    category_id: 'cat-article', status: 'watching', is_favorite: false,
    tags: ['react', 'css'], created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z',
    url: 'https://gamma.com',
  }
  return { LINK_A, LINK_B, LINK_C }
})

vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast, dismissToast: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/services/links', () => ({
  getLinksPage: vi.fn(),
  getMatchingLinkIds: vi.fn(),
  getLinksByIds: vi.fn(),
  SELECT_ALL_MATCHING_CAP: 2000,
  deleteLink: vi.fn().mockResolvedValue('deleted'),
  toggleLinkFavorite: vi.fn().mockResolvedValue(true),
  markLinkMovedToEnd: vi.fn().mockResolvedValue(true),
  updateLinkStatus: vi.fn().mockResolvedValue(true),
  bulkUpdateStatus: vi.fn().mockResolvedValue(true),
  bulkSoftDelete: vi.fn().mockResolvedValue({ deletedIds: [] }),
  bulkUpdateCategory: vi.fn().mockResolvedValue(true),
  bulkAddTags: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/services/tags/tags', () => ({
  getPrivateTagIds: vi.fn(),
  isTagVisible: (isPrivate: boolean, id: string, unlockedTagIds: Set<string>) =>
    !isPrivate || unlockedTagIds.has(id),
}))

const mockUseUnlockedTags = vi.fn()
vi.mock('@/lib/context/UnlockedTagsContext', () => ({
  useUnlockedTags: () => mockUseUnlockedTags(),
}))

vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: mockRefetchTags }),
}))

vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: {} as CryptoKey, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

import { getLinksPage, markLinkMovedToEnd } from '@/lib/services/links'
import { getPrivateTagIds } from '@/lib/services/tags/tags'
const mockGetLinksPage = vi.mocked(getLinksPage)
const mockMarkLinkMovedToEnd = vi.mocked(markLinkMovedToEnd)
const mockGetPrivateTagIds = vi.mocked(getPrivateTagIds)

function fakeSearchLinks(params: LinkFilterParams) {
  let filtered = [LINK_A, LINK_B, LINK_C]
  if (params.categoryId) filtered = filtered.filter(l => l.category_id === params.categoryId)
  if (params.favoritesOnly) filtered = filtered.filter(l => l.is_favorite)
  return { links: filtered, totalCount: filtered.length, unreadCount: filtered.filter(l => l.status === 'unread').length }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetLinksPage.mockImplementation(async params => fakeSearchLinks(params))
  mockGetPrivateTagIds.mockResolvedValue([])
  mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
})

async function renderLoaded() {
  const utils = renderHook(() => useLinkList())
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useLinkList (integration)', () => {
  it('exposes loaded links and the true totalCount', async () => {
    const { result } = await renderLoaded()
    expect(result.current.links).toHaveLength(3)
    expect(result.current.totalCount).toBe(3)
  })

  it('links reflect active filters (useLinks and useLinkFilters are wired together)', async () => {
    const { result } = await renderLoaded()

    act(() => result.current.setCategory('cat-youtube'))

    await waitFor(() => expect(result.current.links.map(l => l.id)).toEqual(['2']))
  })

  it('exposes addToast from the toast context', async () => {
    const { result } = await renderLoaded()

    act(() => result.current.addToast('hello'))

    expect(mockAddToast).toHaveBeenCalledWith('hello')
  })

  describe('handleStatusChange', () => {
    it('syncs activeLink status when it is the target', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setActiveLink(LINK_A))
      act(() => result.current.handleStatusChange('1', 'read'))

      expect(result.current.activeLink?.status).toBe('read')
    })

    it('leaves activeLink unchanged when it is not the target', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setActiveLink(LINK_A))
      act(() => result.current.handleStatusChange('2', 'archived'))

      expect(result.current.activeLink?.id).toBe('1')
      expect(result.current.activeLink?.status).toBe('unread')
    })
  })

  describe('handleFavoriteToggle', () => {
    it('syncs activeLink is_favorite when it is the target', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setActiveLink(LINK_A))
      act(() => result.current.handleFavoriteToggle('1'))

      expect(result.current.activeLink?.is_favorite).toBe(true)
    })

    it('leaves activeLink unchanged when it is not the target', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setActiveLink(LINK_A))
      act(() => result.current.handleFavoriteToggle('2'))

      expect(result.current.activeLink?.id).toBe('1')
      expect(result.current.activeLink?.is_favorite).toBe(false)
    })
  })

  describe('handleLinkOpen', () => {
    it('changes status to watching when link is unread', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleLinkOpen('1', 'unread'))

      expect(result.current.links.find(l => l.id === '1')?.status).toBe('watching')
    })

    it('does nothing when status is not unread', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleLinkOpen('2', 'read'))

      expect(result.current.links.find(l => l.id === '2')?.status).toBe('read')
    })

    it('does nothing when status is watching', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleLinkOpen('3', 'watching'))

      expect(result.current.links.find(l => l.id === '3')?.status).toBe('watching')
    })

    it('records the opened link as lastOpenedId, replacing the previous one', async () => {
      const { result } = await renderLoaded()
      expect(result.current.lastOpenedId).toBeNull()

      act(() => result.current.handleLinkOpen('2', 'read'))
      expect(result.current.lastOpenedId).toBe('2')

      act(() => result.current.handleLinkOpen('3', 'watching'))
      expect(result.current.lastOpenedId).toBe('3')
    })
  })

  describe('move opened link to end', () => {
    afterEach(() => vi.useRealTimers())

    // Load with real timers (waitFor), then switch so the 30 s timers are fake.
    async function renderLoadedWithFakeTimers() {
      const utils = await renderLoaded()
      vi.useFakeTimers()
      return utils
    }

    async function advance(ms: number) {
      await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
    }

    const ids = (links: LinkWithTags[]) => links.map(l => l.id)

    it('moves an opened link to the end after 30 s, saves it, and keeps it as lastOpenedId', async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('1', 'unread'))
      await advance(29_999)
      expect(ids(result.current.links)).toEqual(['1', '2', '3'])

      await advance(1)
      expect(ids(result.current.links)).toEqual(['2', '3', '1'])
      expect(mockMarkLinkMovedToEnd).toHaveBeenCalledWith('1', expect.any(String))
      expect(result.current.lastOpenedId).toBe('1')
    })

    it('moves a link whatever its status', async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('2', 'read'))
      await advance(30_000)

      expect(ids(result.current.links)).toEqual(['1', '3', '2'])
    })

    it('does not move while the edit modal is open, then moves 30 s after it closes', async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('1', 'unread'))
      act(() => result.current.setEditingLink(LINK_C))
      await advance(60_000)
      expect(ids(result.current.links)).toEqual(['1', '2', '3'])

      act(() => result.current.setEditingLink(null))
      await advance(29_999)
      expect(mockMarkLinkMovedToEnd).not.toHaveBeenCalled()
      await advance(1)
      expect(ids(result.current.links)).toEqual(['2', '3', '1'])
    })

    it("pauses only the link whose menu is open; another opened link still moves", async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('1', 'unread'))
      act(() => result.current.handleLinkOpen('2', 'read'))
      act(() => result.current.setActiveLink(LINK_A))
      await advance(30_000)
      expect(ids(result.current.links)).toEqual(['1', '3', '2'])
      expect(mockMarkLinkMovedToEnd).toHaveBeenCalledTimes(1)

      act(() => result.current.setActiveLink(null))
      await advance(30_000)
      expect(ids(result.current.links)).toEqual(['3', '2', '1'])
    })

    it('does not move while selection mode is active, then moves 30 s after leaving it', async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('1', 'unread'))
      act(() => result.current.enterSelectionMode())
      await advance(60_000)
      expect(mockMarkLinkMovedToEnd).not.toHaveBeenCalled()

      act(() => result.current.exitSelectionMode())
      await advance(30_000)
      expect(ids(result.current.links)).toEqual(['2', '3', '1'])
    })

    it('a filter change before 30 s cancels the move and saves nothing', async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('1', 'unread'))
      act(() => result.current.setCategory('cat-article'))
      await advance(60_000)

      expect(mockMarkLinkMovedToEnd).not.toHaveBeenCalled()
      expect(ids(result.current.links)).toEqual(['1', '3'])
    })

    it('handleRefresh before 30 s cancels the move and saves nothing', async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('1', 'unread'))
      await act(async () => { await result.current.handleRefresh() })
      await advance(60_000)

      expect(mockMarkLinkMovedToEnd).not.toHaveBeenCalled()
      expect(ids(result.current.links)).toEqual(['1', '2', '3'])
    })

    it('opening A, then B 10 s later, moves A at 30 s and B at 40 s', async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('1', 'unread'))
      await advance(10_000)
      act(() => result.current.handleLinkOpen('2', 'read'))

      await advance(20_000)
      expect(ids(result.current.links)).toEqual(['2', '3', '1'])

      await advance(10_000)
      expect(ids(result.current.links)).toEqual(['3', '1', '2'])
    })

    it('reopening a moved link moves it to the very end again with a newer move time', async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('1', 'unread'))
      await advance(30_000)
      act(() => result.current.handleLinkOpen('2', 'read'))
      await advance(30_000)
      expect(ids(result.current.links)).toEqual(['3', '1', '2'])

      act(() => result.current.handleLinkOpen('1', 'watching'))
      await advance(30_000)
      expect(ids(result.current.links)).toEqual(['3', '2', '1'])

      const movesOfA = mockMarkLinkMovedToEnd.mock.calls.filter(([id]) => id === '1').map(([, at]) => Date.parse(at as string))
      expect(movesOfA).toHaveLength(2)
      expect(movesOfA[1]).toBeGreaterThan(movesOfA[0])
    })

    it('cancels the pending move when the link leaves the list, even if it comes back (undo delete)', async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('1', 'unread'))
      act(() => result.current.handleDeleteById('1'))
      const undo = mockAddToast.mock.calls.find(([msg]) => msg === 'Link deleted, tap to undo')![2].onClick
      act(() => undo())
      expect(ids(result.current.links)).toEqual(['1', '2', '3'])

      await advance(60_000)
      expect(mockMarkLinkMovedToEnd).not.toHaveBeenCalled()
      expect(ids(result.current.links)).toEqual(['1', '2', '3'])
    })

    it('a link deleted before 30 s does not come back and saves nothing', async () => {
      const { result } = await renderLoadedWithFakeTimers()

      act(() => result.current.handleLinkOpen('1', 'unread'))
      act(() => result.current.handleDeleteById('1'))
      await advance(60_000)

      expect(mockMarkLinkMovedToEnd).not.toHaveBeenCalled()
      expect(ids(result.current.links)).toEqual(['2', '3'])
    })

    describe('undo last move', () => {
      it('has no lastMovedLink before any move', async () => {
        const { result } = await renderLoaded()
        expect(result.current.lastMovedLink).toBeNull()
      })

      it('puts the moved link back at its old index, saves null, and keeps its status', async () => {
        const { result } = await renderLoadedWithFakeTimers()

        act(() => result.current.handleLinkOpen('1', 'unread'))
        await advance(30_000)
        expect(ids(result.current.links)).toEqual(['2', '3', '1'])
        expect(result.current.lastMovedLink?.id).toBe('1')

        await act(async () => { result.current.handleUndoMove() })

        expect(ids(result.current.links)).toEqual(['1', '2', '3'])
        expect(mockMarkLinkMovedToEnd).toHaveBeenLastCalledWith('1', null)
        expect(result.current.links[0].status).toBe('watching')
        expect(result.current.lastMovedLink).toBeNull()
      })

      it('cancels a pending re-move, so the link does not move again', async () => {
        const { result } = await renderLoadedWithFakeTimers()

        act(() => result.current.handleLinkOpen('1', 'unread'))
        await advance(30_000)
        act(() => result.current.handleLinkOpen('1', 'watching'))
        await act(async () => { result.current.handleUndoMove() })
        expect(ids(result.current.links)).toEqual(['1', '2', '3'])

        await advance(60_000)
        expect(ids(result.current.links)).toEqual(['1', '2', '3'])
        expect(mockMarkLinkMovedToEnd).toHaveBeenCalledTimes(2)
      })

      it('a filter change clears lastMovedLink', async () => {
        const { result } = await renderLoadedWithFakeTimers()
        act(() => result.current.handleLinkOpen('1', 'unread'))
        await advance(30_000)

        act(() => result.current.setCategory('cat-article'))

        expect(result.current.lastMovedLink).toBeNull()
      })

      it('handleRefresh clears lastMovedLink', async () => {
        const { result } = await renderLoadedWithFakeTimers()
        act(() => result.current.handleLinkOpen('1', 'unread'))
        await advance(30_000)

        await act(async () => { await result.current.handleRefresh() })

        expect(result.current.lastMovedLink).toBeNull()
      })

      it('deleting the moved link clears lastMovedLink', async () => {
        const { result } = await renderLoadedWithFakeTimers()
        act(() => result.current.handleLinkOpen('1', 'unread'))
        await advance(30_000)

        act(() => result.current.handleDeleteById('1'))

        expect(result.current.lastMovedLink).toBeNull()
      })
    })
  })

  describe('handleEdit', () => {
    it('clears editingLink (cross-hook coordination)', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setEditingLink(LINK_A))
      act(() => result.current.handleEdit({ ...LINK_A, title: 'Updated' }))

      expect(result.current.editingLink).toBeNull()
    })
  })

  describe('handleDeleteById', () => {
    it('removes the link with the given id from links without requiring activeLink', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleDeleteById('1'))

      expect(result.current.links.find(l => l.id === '1')).toBeUndefined()
    })

    it('leaves other links intact', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleDeleteById('3'))

      expect(result.current.links).toHaveLength(2)
      expect(result.current.links.map(l => l.id)).toEqual(expect.arrayContaining(['1', '2']))
    })

    it('does not clear or require activeLink', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setActiveLink(LINK_B))
      act(() => result.current.handleDeleteById('1'))

      expect(result.current.activeLink?.id).toBe('2')
    })
  })

  describe('header counts', () => {
    it('handleDeleteById on an unread link lowers totalCount and unreadCount at once', async () => {
      const { result } = await renderLoaded()
      expect(result.current.totalCount).toBe(3)
      expect(result.current.unreadCount).toBe(1)

      act(() => result.current.handleDeleteById('1'))

      expect(result.current.totalCount).toBe(2)
      expect(result.current.unreadCount).toBe(0)
    })

    it('undo on the delete toast puts both counts back', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleDeleteById('1'))
      const undo = mockAddToast.mock.calls.find(([msg]) => msg === 'Link deleted, tap to undo')![2].onClick
      act(() => undo())

      expect(result.current.totalCount).toBe(3)
      expect(result.current.unreadCount).toBe(1)
    })

    it('handleCreate with an unread link raises both counts', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleCreate({ ...LINK_A, id: '99', title: 'Brand New' }))

      expect(result.current.totalCount).toBe(4)
      expect(result.current.unreadCount).toBe(2)
    })
  })

  describe('favoritesOnly', () => {
    it('is passed through from useLinkFilters and filters links', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setFavoritesOnly(true))

      await waitFor(() => expect(result.current.links.map(l => l.id)).toEqual(['2']))
    })
  })

  describe('handleCreate', () => {
    it('prepends the new link and it appears in links', async () => {
      const { result } = await renderLoaded()
      const newLink = { ...LINK_A, id: '99', title: 'Brand New', created_at: '2026-12-31T00:00:00Z' }

      act(() => result.current.handleCreate(newLink))

      expect(result.current.links[0].id).toBe('99')
      expect(result.current.links).toHaveLength(4)
    })
  })

  describe('handleRefresh', () => {
    it('calls refetchTags, reloads page 1 and bumps refreshKey', async () => {
      const { result } = await renderLoaded()
      expect(result.current.refreshKey).toBe(0)
      mockGetLinksPage.mockClear()

      const LINK_NEW: LinkWithTags = { ...LINK_A, id: '4', title: 'Delta' }
      mockGetLinksPage.mockResolvedValueOnce({ links: [LINK_NEW, LINK_A, LINK_B, LINK_C], totalCount: 4, unreadCount: 0 })
      await act(async () => { await result.current.handleRefresh() })

      expect(mockRefetchTags).toHaveBeenCalledOnce()
      expect(mockGetLinksPage).toHaveBeenCalledOnce()
      expect(mockGetPrivateTagIds).toHaveBeenCalledTimes(2)
      expect(result.current.links.map(l => l.id)).toEqual(['4', '1', '2', '3'])
      expect(result.current.totalCount).toBe(4)
      expect(result.current.refreshKey).toBe(1)
      expect(result.current.refreshing).toBe(false)
      expect(mockAddToast).not.toHaveBeenCalled()
    })

    it('shows a destructive toast and keeps the list when the refresh fails', async () => {
      const { result } = await renderLoaded()

      mockGetLinksPage.mockRejectedValueOnce(new Error('offline'))
      await act(async () => { await result.current.handleRefresh() })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to refresh links', 'destructive')
      expect(result.current.links).toHaveLength(3)
      expect(result.current.totalCount).toBe(3)
      expect(result.current.refreshing).toBe(false)
      expect(result.current.refreshKey).toBe(0)
    })

    it('ignores a second call while a refresh is in flight', async () => {
      const { result } = await renderLoaded()
      mockGetLinksPage.mockClear()

      await act(async () => {
        const first = result.current.handleRefresh()
        const second = result.current.handleRefresh()
        await Promise.all([first, second])
      })

      expect(mockRefetchTags).toHaveBeenCalledOnce()
      expect(mockGetLinksPage).toHaveBeenCalledOnce()
    })

    it('leaves filters and unlocked private tags untouched', async () => {
      const unlocked = { unlockedTagIds: new Set(['secret']), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() }
      mockUseUnlockedTags.mockReturnValue(unlocked)
      const { result } = await renderLoaded()

      act(() => {
        result.current.setCategory('cat-article')
        result.current.setSortBy('oldest')
        result.current.setFavoritesOnly(false)
      })
      await waitFor(() => expect(result.current.links.map(l => l.id)).toEqual(['1', '3']))
      const before = result.current.filterParams

      await act(async () => { await result.current.handleRefresh() })

      expect(result.current.filterParams).toEqual(before)
      expect(result.current.category).toBe('cat-article')
      expect(result.current.sortBy).toBe('oldest')
      expect(result.current.links.map(l => l.id)).toEqual(['1', '3'])
      expect(unlocked.lockAll).not.toHaveBeenCalled()
      expect(unlocked.lockTag).not.toHaveBeenCalled()
      expect(unlocked.unlockedTagIds).toEqual(new Set(['secret']))
    })
  })
})
