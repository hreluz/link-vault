// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLinkListQuery } from '@/lib/hooks/links/useLinkListQuery'
import type { LinkWithTags, LinkFilterParams } from '@/lib/services/links'

const FAKE_DEK = { fake: true } as unknown as CryptoKey

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
  textSearch: '', categoryId: null, statuses: [], tagIds: [], tagMode: 'any',
  favoritesOnly: false, sortBy: 'newest', unlockedTagIds: [],
}

vi.mock('@/lib/services/links', () => ({
  getLinksPage: vi.fn(),
  getMatchingLinkIds: vi.fn(),
  getLinksByIds: vi.fn(),
}))

vi.mock('@/lib/services/tags', () => ({
  getPrivateTagIds: vi.fn(),
  isTagVisible: (isPrivate: boolean, id: string, unlockedTagIds: Set<string>) =>
    !isPrivate || unlockedTagIds.has(id),
}))

const mockUseUnlockedTags = vi.fn()
vi.mock('@/lib/context/UnlockedTagsContext', () => ({
  useUnlockedTags: () => mockUseUnlockedTags(),
}))

import { getLinksPage, getMatchingLinkIds, getLinksByIds } from '@/lib/services/links'
import { getPrivateTagIds } from '@/lib/services/tags'
const mockGetLinksPage = vi.mocked(getLinksPage)
const mockGetMatchingLinkIds = vi.mocked(getMatchingLinkIds)
const mockGetLinksByIds = vi.mocked(getLinksByIds)
const mockGetPrivateTagIds = vi.mocked(getPrivateTagIds)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 2 })
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

      expect(mockGetLinksPage).toHaveBeenLastCalledWith(FILTER_PARAMS, 40, 1, FAKE_DEK)
      expect(result.current.links.map(l => l.id)).toEqual(['1', '2'])
      expect(result.current.hasMore).toBe(false)
    })
  })

  describe('privacy filtering', () => {
    it('shows all links when there are no private tags', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 2 })
      mockGetPrivateTagIds.mockResolvedValue([])
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
    })

    it('hides a link whose tag is private and locked', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_PRIVATE], totalCount: 2 })
      mockGetPrivateTagIds.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(1)
      expect(result.current.links[0].id).toBe('1')
    })

    it('shows a link whose private tag has been unlocked', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_PRIVATE], totalCount: 2 })
      mockGetPrivateTagIds.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(['private-stuff']), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(2)
    })

    it('hides a link that has both a public and a locked private tag', async () => {
      const mixedLink: LinkWithTags = { ...LINK_A, id: '5', tags: ['react', 'private-stuff'] }
      mockGetLinksPage.mockResolvedValue({ links: [mixedLink], totalCount: 1 })
      mockGetPrivateTagIds.mockResolvedValue(['private-stuff'])
      mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = await renderLoaded()
      expect(result.current.links).toHaveLength(0)
    })

    it('shows all links once all private tags are unlocked', async () => {
      mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B, LINK_PRIVATE], totalCount: 3 })
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
})
