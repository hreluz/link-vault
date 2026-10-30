// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLinkListQuery } from '@/lib/hooks/links/list/useLinkListQuery'
import type { LinkWithTags, LinkFilterParams } from '@/lib/services/links'

const FAKE_DEK = { fake: true } as unknown as CryptoKey

const { LINK_A, LINK_B, LINK_PRIVATE } = vi.hoisted(() => {
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
  const LINK_PRIVATE: LinkWithTags = {
    id: '3', title: 'Secret', site_name: 'secret.com',
    status: 'unread', is_favorite: false, deleted_at: null, moved_to_end_at: null, image_url: null, duration: null,
    tags: ['private-stuff'], created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z',
    url: 'https://secret.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  return { LINK_A, LINK_B, LINK_PRIVATE }
})

const FILTER_PARAMS: LinkFilterParams = {
  textSearch: '', categoryId: null, statuses: [], tagIds: [], tagMode: 'any',
  favoritesOnly: false, sortBy: 'newest', unlockedTagIds: [],
}

vi.mock('@/lib/services/links', () => ({
  getLinksPage: vi.fn(),
  getMatchingLinkIds: vi.fn(),
  getLinksByIds: vi.fn(),
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

import { getLinksPage, getMatchingLinkIds, getLinksByIds } from '@/lib/services/links'
import { getPrivateTagIds } from '@/lib/services/tags/tags'
const mockGetLinksPage = vi.mocked(getLinksPage)
const mockGetMatchingLinkIds = vi.mocked(getMatchingLinkIds)
const mockGetLinksByIds = vi.mocked(getLinksByIds)
const mockGetPrivateTagIds = vi.mocked(getPrivateTagIds)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 2, unreadCount: 0 })
  mockGetPrivateTagIds.mockResolvedValue([])
  mockGetMatchingLinkIds.mockResolvedValue({ ids: ['1', '2'], totalCount: 2 })
  mockGetLinksByIds.mockResolvedValue([LINK_A, LINK_B])
  mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
})

async function renderLoaded(params: LinkFilterParams = FILTER_PARAMS, dek: CryptoKey | null = FAKE_DEK) {
  const utils = renderHook(({ p, d }: { p: LinkFilterParams; d: CryptoKey | null }) => useLinkListQuery(p, d), {
    initialProps: { p: params, d: dek },
  })
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useLinkListQuery', () => {
  describe('initial state', () => {
    it('starts in loading state with no links', () => {
      const { result } = renderHook(() => useLinkListQuery(FILTER_PARAMS, FAKE_DEK))
      expect(result.current.loading).toBe(true)
      expect(result.current.links).toHaveLength(0)
    })

    it('loads links from the service and clears loading', async () => {
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
      expect(result.current.loading).toBe(false)
    })

    it('fetches the first page with the given filter params and the vault key', async () => {
      await renderLoaded()
      expect(mockGetLinksPage).toHaveBeenCalledWith(FILTER_PARAMS, 40, 0, FAKE_DEK)
    })

    it('exposes totalCount and hasMore from the service response', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 50, unreadCount: 0 })
      const { result } = await renderLoaded()
      expect(result.current.totalCount).toBe(50)
      expect(result.current.hasMore).toBe(true)
    })
  })

  describe('unreadCount', () => {
    it('comes from the service response when no text search or alphabetical sort is active', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 50, unreadCount: 17 })
      const { result } = await renderLoaded()
      expect(result.current.unreadCount).toBe(17)
    })

    it('counts unread links among the filtered candidates during a text search', async () => {
      const LINK_C: LinkWithTags = { ...LINK_A, id: '4', title: 'Alphabet', status: 'read' }
      mockGetMatchingLinkIds.mockResolvedValue({ ids: ['1', '2', '4'], totalCount: 3 })
      mockGetLinksByIds.mockResolvedValue([LINK_A, LINK_B, LINK_C])
      const { result } = await renderLoaded({ ...FILTER_PARAMS, textSearch: 'alpha' })
      expect(result.current.totalCount).toBe(2)
      expect(result.current.unreadCount).toBe(1)
    })

    it('follows status changes on loaded links without a refetch', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 2, unreadCount: 1 })
      const { result } = await renderLoaded()

      act(() => result.current.setRawLinks(prev => prev.map(l => l.id === '1' ? { ...l, status: 'watching' } : l)))
      expect(result.current.unreadCount).toBe(0)

      act(() => result.current.setRawLinks(prev => prev.map(l => l.id === '2' ? { ...l, status: 'unread' } : l)))
      expect(result.current.unreadCount).toBe(1)
    })

    it('drops both counts when an unread loaded link is removed, and only the total for a read one', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 10, unreadCount: 4 })
      const { result } = await renderLoaded()

      act(() => result.current.setRawLinks(prev => prev.filter(l => l.id !== '1')))
      expect(result.current.totalCount).toBe(9)
      expect(result.current.unreadCount).toBe(3)

      act(() => result.current.setRawLinks(prev => prev.filter(l => l.id !== '2')))
      expect(result.current.totalCount).toBe(8)
      expect(result.current.unreadCount).toBe(3)
    })

    it('restores both counts when a removed link is put back', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 10, unreadCount: 4 })
      const { result } = await renderLoaded()

      act(() => result.current.setRawLinks(prev => prev.filter(l => l.id !== '1')))
      act(() => result.current.setRawLinks(prev => [LINK_A, ...prev]))

      expect(result.current.totalCount).toBe(10)
      expect(result.current.unreadCount).toBe(4)
    })

    it('raises both counts for a new unread link, and only the total for a new read one', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 10, unreadCount: 4 })
      const { result } = await renderLoaded()

      act(() => result.current.setRawLinks(prev => [{ ...LINK_A, id: 'new-1' }, ...prev]))
      expect(result.current.totalCount).toBe(11)
      expect(result.current.unreadCount).toBe(5)

      act(() => result.current.setRawLinks(prev => [{ ...LINK_B, id: 'new-2' }, ...prev]))
      expect(result.current.totalCount).toBe(12)
      expect(result.current.unreadCount).toBe(5)
    })

    it('keeps hasMore on the server count when a link is removed', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 3, unreadCount: 1 })
      const { result } = await renderLoaded()
      expect(result.current.hasMore).toBe(true)

      act(() => result.current.setRawLinks(prev => prev.filter(l => l.id !== '1')))

      expect(result.current.totalCount).toBe(2)
      expect(result.current.hasMore).toBe(true)
    })

    it('never goes below 0', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 0, unreadCount: 0 })
      const { result } = await renderLoaded()

      act(() => result.current.setRawLinks([]))

      expect(result.current.totalCount).toBe(0)
      expect(result.current.unreadCount).toBe(0)
    })

    it('goes back to the server counts after refresh', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 10, unreadCount: 4 })
      const { result } = await renderLoaded()
      act(() => result.current.setRawLinks(prev => prev.filter(l => l.id !== '1')))

      mockGetLinksPage.mockResolvedValue({ links: [LINK_B], totalCount: 9, unreadCount: 3 })
      await act(async () => { await result.current.refresh() })

      expect(result.current.totalCount).toBe(9)
      expect(result.current.unreadCount).toBe(3)
    })

    it('includes the count from the latest loaded page', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A], totalCount: 2, unreadCount: 1 })
      const { result } = await renderLoaded()

      mockGetLinksPage.mockResolvedValue({ links: [LINK_B], totalCount: 2, unreadCount: 2 })
      await act(async () => { result.current.loadMore() })

      expect(result.current.unreadCount).toBe(2)
    })
  })

  describe('loadMore', () => {
    it('fetches the next page at the current offset and appends it', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A], totalCount: 2, unreadCount: 0 })
      const { result } = await renderLoaded()

      mockGetLinksPage.mockResolvedValue({ links: [LINK_B], totalCount: 2, unreadCount: 0 })
      await act(async () => { result.current.loadMore() })

      expect(mockGetLinksPage).toHaveBeenLastCalledWith(FILTER_PARAMS, 40, 1, FAKE_DEK)
      expect(result.current.links.map(l => l.id)).toEqual(['1', '2'])
      expect(result.current.hasMore).toBe(false)
    })
  })

  describe('shiftServerOffset', () => {
    it('corrects the next page offset after a saved reorder', async () => {
      mockGetLinksPage.mockResolvedValue({ links: Array.from({ length: 40 }, (_, i) => ({ ...LINK_A, id: `p${i}` })), totalCount: 80, unreadCount: 0 })
      const { result } = await renderLoaded()

      act(() => result.current.shiftServerOffset(-1))
      await act(async () => { result.current.loadMore() })

      expect(mockGetLinksPage).toHaveBeenLastCalledWith(FILTER_PARAMS, 40, 39, FAKE_DEK)
    })

    it('is reset by a filter change', async () => {
      mockGetLinksPage.mockResolvedValue({ links: Array.from({ length: 40 }, (_, i) => ({ ...LINK_A, id: `p${i}` })), totalCount: 80, unreadCount: 0 })
      const { result, rerender } = await renderLoaded()

      act(() => result.current.shiftServerOffset(-1))
      const params = { ...FILTER_PARAMS, categoryId: 'cat-1' }
      rerender({ p: params, d: FAKE_DEK })
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(mockGetLinksPage).toHaveBeenLastCalledWith(params, 40, 0, FAKE_DEK)

      await act(async () => { result.current.loadMore() })
      expect(mockGetLinksPage).toHaveBeenLastCalledWith(params, 40, 40, FAKE_DEK)
    })

    it('is reset by refresh', async () => {
      mockGetLinksPage.mockResolvedValue({ links: Array.from({ length: 40 }, (_, i) => ({ ...LINK_A, id: `p${i}` })), totalCount: 80, unreadCount: 0 })
      const { result } = await renderLoaded()

      act(() => result.current.shiftServerOffset(-1))
      await act(async () => { await result.current.refresh() })
      expect(mockGetLinksPage).toHaveBeenLastCalledWith(FILTER_PARAMS, 40, 0, FAKE_DEK)

      await act(async () => { result.current.loadMore() })
      expect(mockGetLinksPage).toHaveBeenLastCalledWith(FILTER_PARAMS, 40, 40, FAKE_DEK)
    })
  })

  describe('privacy filtering', () => {
    it('shows all links when there are no private tags', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 2, unreadCount: 0 })
      mockGetPrivateTagIds.mockResolvedValue([])
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
    })

    it('hides a link whose tag is private and locked', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_PRIVATE], totalCount: 2, unreadCount: 0 })
      mockGetPrivateTagIds.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(1)
      expect(result.current.links[0].id).toBe('1')
    })

    it('shows a link whose private tag has been unlocked', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_PRIVATE], totalCount: 2, unreadCount: 0 })
      mockGetPrivateTagIds.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(['private-stuff']), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
    })

    it('hides a link that has both a public and a locked private tag', async () => {
      const mixedLink: LinkWithTags = { ...LINK_A, id: '5', tags: ['react', 'private-stuff'] }
      mockGetLinksPage.mockResolvedValue({ links: [mixedLink], totalCount: 1, unreadCount: 0 })
      mockGetPrivateTagIds.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(0)
    })

    it('shows all links once all private tags are unlocked', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B, LINK_PRIVATE], totalCount: 3, unreadCount: 0 })
      mockGetPrivateTagIds.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(['private-stuff']), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(3)
    })
  })

  describe('text-search candidate cache (Branch B)', () => {
    it('reuses cached candidates when only textSearch changes', async () => {
      const params: LinkFilterParams = { ...FILTER_PARAMS, textSearch: 'alpha' }
      const { rerender, result } = await renderLoaded(params)
      expect(mockGetMatchingLinkIds).toHaveBeenCalledOnce()

      rerender({ p: { ...params, textSearch: 'beta' }, d: FAKE_DEK })
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(mockGetMatchingLinkIds).toHaveBeenCalledOnce()
    })

    it('refetches candidates when a structural filter changes', async () => {
      const params: LinkFilterParams = { ...FILTER_PARAMS, textSearch: 'alpha' }
      const { rerender, result } = await renderLoaded(params)
      expect(mockGetMatchingLinkIds).toHaveBeenCalledOnce()

      rerender({ p: { ...params, categoryId: 'cat-1' }, d: FAKE_DEK })
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(mockGetMatchingLinkIds).toHaveBeenCalledTimes(2)
    })
  })

  describe('moved links last (Branch B)', () => {
    const CANDIDATES: LinkWithTags[] = [
      { ...LINK_A, id: 'm1', title: 'Apple', moved_to_end_at: '2026-02-02T00:00:00Z' },
      { ...LINK_A, id: 'u1', title: 'Delta' },
      { ...LINK_A, id: 'm2', title: 'Banana', moved_to_end_at: '2026-02-01T00:00:00Z' },
      { ...LINK_A, id: 'u2', title: 'Cherry' },
    ]

    it('with alphabetical sort, lists unmoved links alphabetically, then moved ones by move time', async () => {
      mockGetMatchingLinkIds.mockResolvedValue({ ids: CANDIDATES.map(l => l.id), totalCount: 4 })
      mockGetLinksByIds.mockResolvedValue(CANDIDATES)
      const { result } = await renderLoaded({ ...FILTER_PARAMS, sortBy: 'alphabetical' })
      expect(result.current.links.map(l => l.id)).toEqual(['u2', 'u1', 'm2', 'm1'])
    })

    it('with a text search, keeps unmoved matches first, then moved ones by move time', async () => {
      const withSearchable = CANDIDATES.map(l => ({ ...l, url: `https://match.com/${l.id}` }))
      mockGetMatchingLinkIds.mockResolvedValue({ ids: withSearchable.map(l => l.id), totalCount: 4 })
      mockGetLinksByIds.mockResolvedValue(withSearchable)
      const { result } = await renderLoaded({ ...FILTER_PARAMS, textSearch: 'match' })
      expect(result.current.links.map(l => l.id)).toEqual(['u1', 'u2', 'm2', 'm1'])
    })
  })

  describe('holding moved links back until the last page', () => {
    const PAGE_1 = Array.from({ length: 40 }, (_, i) => ({ ...LINK_A, id: `p${i}`, status: 'read' as const }))
    const PAGE_2 = [{ ...LINK_B, id: 'q0' }, { ...LINK_B, id: 'q1' }]

    function markMoved(id: string, at: string) {
      return (prev: LinkWithTags[]) => prev.map(l => l.id === id ? { ...l, moved_to_end_at: at } : l)
    }

    it('leaves a moved link out of links while more pages remain, but keeps it in loadedLinks and the counts', async () => {
      mockGetLinksPage.mockResolvedValue({ links: PAGE_1, totalCount: 42, unreadCount: 0 })
      const { result } = await renderLoaded()

      act(() => result.current.setRawLinks(markMoved('p3', '2026-02-01T00:00:00Z')))

      expect(result.current.hasMore).toBe(true)
      expect(result.current.links.map(l => l.id)).not.toContain('p3')
      expect(result.current.links).toHaveLength(39)
      expect(result.current.loadedLinks.map(l => l.id)).toContain('p3')
      expect(result.current.totalCount).toBe(42)
      expect(result.current.unreadCount).toBe(0)
    })

    it('shows the next page right after the remaining unmoved links, and moved ones at the end once all pages are in', async () => {
      mockGetLinksPage.mockResolvedValue({ links: PAGE_1, totalCount: 42, unreadCount: 0 })
      const { result } = await renderLoaded()
      act(() => result.current.setRawLinks(markMoved('p3', '2026-02-01T00:00:00Z')))

      mockGetLinksPage.mockResolvedValue({ links: PAGE_2, totalCount: 42, unreadCount: 0 })
      await act(async () => { result.current.loadMore() })

      const ids = result.current.links.map(l => l.id)
      expect(result.current.hasMore).toBe(false)
      expect(ids.slice(38)).toEqual(['p39', 'q0', 'q1', 'p3'])
    })

    it('shows several held-back links oldest move first', async () => {
      mockGetLinksPage.mockResolvedValue({ links: PAGE_1, totalCount: 42, unreadCount: 0 })
      const { result } = await renderLoaded()
      act(() => result.current.setRawLinks(markMoved('p1', '2026-02-03T00:00:00Z')))
      act(() => result.current.setRawLinks(markMoved('p2', '2026-02-01T00:00:00Z')))
      act(() => result.current.setRawLinks(markMoved('p5', '2026-02-02T00:00:00Z')))

      mockGetLinksPage.mockResolvedValue({ links: PAGE_2, totalCount: 42, unreadCount: 0 })
      await act(async () => { result.current.loadMore() })

      expect(result.current.links.map(l => l.id).slice(-3)).toEqual(['p2', 'p5', 'p1'])
    })

    it('holds back a link that came from the server already moved', async () => {
      const page = [...PAGE_1.slice(0, 39), { ...LINK_A, id: 'old-move', moved_to_end_at: '2026-01-15T00:00:00Z' }]
      mockGetLinksPage.mockResolvedValue({ links: page, totalCount: 42, unreadCount: 0 })
      const { result } = await renderLoaded()

      expect(result.current.links.map(l => l.id)).not.toContain('old-move')
      expect(result.current.loadedLinks.map(l => l.id)).toContain('old-move')
    })

    it('puts a moved link at the end right away when there are no more pages', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 2, unreadCount: 0 })
      const { result } = await renderLoaded()

      act(() => result.current.setRawLinks(markMoved('1', '2026-02-01T00:00:00Z')))

      expect(result.current.hasMore).toBe(false)
      expect(result.current.links.map(l => l.id)).toEqual(['2', '1'])
    })

    it('holds moved links back in Branch B too (alphabetical sort)', async () => {
      const candidates = Array.from({ length: 42 }, (_, i) => ({ ...LINK_A, id: `c${i}`, title: `T${String(i).padStart(2, '0')}` }))
      mockGetMatchingLinkIds.mockResolvedValue({ ids: candidates.map(l => l.id), totalCount: 42 })
      mockGetLinksByIds.mockResolvedValue(candidates)
      const { result } = await renderLoaded({ ...FILTER_PARAMS, sortBy: 'alphabetical' })

      act(() => result.current.setRawLinks(markMoved('c0', '2026-02-01T00:00:00Z')))
      expect(result.current.hasMore).toBe(true)
      expect(result.current.links[0].id).toBe('c1')

      await act(async () => { result.current.loadMore() })
      const ids = result.current.links.map(l => l.id)
      expect(result.current.hasMore).toBe(false)
      expect(ids.slice(-3)).toEqual(['c40', 'c41', 'c0'])
      expect(new Set(ids).size).toBe(42)
    })

    it('holds moved links back in Branch B too (text search)', async () => {
      const candidates = Array.from({ length: 42 }, (_, i) => ({ ...LINK_A, id: `c${i}`, url: `https://match.com/${i}` }))
      mockGetMatchingLinkIds.mockResolvedValue({ ids: candidates.map(l => l.id), totalCount: 42 })
      mockGetLinksByIds.mockResolvedValue(candidates)
      const { result } = await renderLoaded({ ...FILTER_PARAMS, textSearch: 'match' })

      act(() => result.current.setRawLinks(markMoved('c0', '2026-02-01T00:00:00Z')))
      expect(result.current.links.map(l => l.id)).not.toContain('c0')

      await act(async () => { result.current.loadMore() })
      expect(result.current.links.map(l => l.id).slice(-2)).toEqual(['c41', 'c0'])
    })
  })

  describe('refresh', () => {
    it('re-fetches and re-decrypts candidates when a text search is active', async () => {
      const params: LinkFilterParams = { ...FILTER_PARAMS, textSearch: 'alpha' }
      const { result } = await renderLoaded(params)
      expect(mockGetMatchingLinkIds).toHaveBeenCalledOnce()
      expect(mockGetLinksByIds).toHaveBeenCalledOnce()

      const LINK_NEW: LinkWithTags = { ...LINK_A, id: '9', title: 'Alpha two' }
      mockGetMatchingLinkIds.mockResolvedValue({ ids: ['1', '2', '9'], totalCount: 3 })
      mockGetLinksByIds.mockResolvedValue([LINK_A, LINK_B, LINK_NEW])
      await act(async () => { await result.current.refresh() })

      expect(mockGetMatchingLinkIds).toHaveBeenCalledTimes(2)
      expect(mockGetLinksByIds).toHaveBeenCalledTimes(2)
      expect(result.current.links.map(l => l.id)).toEqual(['1', '9'])
      expect(result.current.totalCount).toBe(2)
    })

    it('re-reads the private tag ids', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_PRIVATE], totalCount: 2, unreadCount: 0 })
      const { result } = await renderLoaded()
      expect(mockGetPrivateTagIds).toHaveBeenCalledOnce()
      expect(result.current.links).toHaveLength(2)

      mockGetPrivateTagIds.mockResolvedValue(['private-stuff'])
      await act(async () => { await result.current.refresh() })

      expect(mockGetPrivateTagIds).toHaveBeenCalledTimes(2)
      expect(result.current.links.map(l => l.id)).toEqual(['1'])
    })
  })
})
