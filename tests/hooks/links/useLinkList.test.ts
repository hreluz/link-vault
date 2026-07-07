// @vitest-environment jsdom
// Integration tests for useLinkList — verifies the composition of the sub-hooks.
// Detailed behavior is covered in useLinks, useLinkFilters, and useLinkModals tests.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLinkList } from '@/lib/hooks/links/useLinkList'
import type { LinkWithTags, LinkFilterParams } from '@/lib/services/links'

const mockAddToast = vi.fn()

const { LINK_A, LINK_B, LINK_C } = vi.hoisted(() => {
  const base = { user_id: 'user-1', description: '', notes: null, image_url: null, deleted_at: null, duration: null }
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

vi.mock('@/lib/services/links', () => ({
  getLinksPage: vi.fn(),
  getMatchingLinkIds: vi.fn(),
  getLinksByIds: vi.fn(),
  SELECT_ALL_MATCHING_CAP: 2000,
  deleteLink: vi.fn().mockResolvedValue(true),
  toggleLinkFavorite: vi.fn().mockResolvedValue(true),
  bulkUpdateStatus: vi.fn().mockResolvedValue(true),
  bulkSoftDelete: vi.fn().mockResolvedValue(true),
  bulkUpdateCategory: vi.fn().mockResolvedValue(true),
  bulkAddTags: vi.fn().mockResolvedValue([]),
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

vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: vi.fn() }),
}))

vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: {} as CryptoKey, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

import { getLinksPage } from '@/lib/services/links'
import { getPrivateTagIds } from '@/lib/services/tags'
const mockGetLinksPage = vi.mocked(getLinksPage)
const mockGetPrivateTagIds = vi.mocked(getPrivateTagIds)

function fakeSearchLinks(params: LinkFilterParams) {
  let filtered = [LINK_A, LINK_B, LINK_C]
  if (params.categoryId) filtered = filtered.filter(l => l.category_id === params.categoryId)
  if (params.favoritesOnly) filtered = filtered.filter(l => l.is_favorite)
  return { links: filtered, totalCount: filtered.length }
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

  describe('handleDelete', () => {
    it('removes the active link from links', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setActiveLink(LINK_A))
      act(() => result.current.handleDelete())

      expect(result.current.links.find(l => l.id === '1')).toBeUndefined()
    })

    it('clears activeLink after deletion', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setActiveLink(LINK_A))
      act(() => result.current.handleDelete())

      expect(result.current.activeLink).toBeNull()
    })

    it('does nothing when activeLink is null', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleDelete())

      expect(result.current.links).toHaveLength(3)
      expect(mockAddToast).not.toHaveBeenCalled()
    })
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

      act(() => result.current.handleDeleteById('2'))

      expect(result.current.links).toHaveLength(2)
      expect(result.current.links.map(l => l.id)).toEqual(expect.arrayContaining(['1', '3']))
    })

    it('does not clear or require activeLink', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setActiveLink(LINK_B))
      act(() => result.current.handleDeleteById('1'))

      expect(result.current.activeLink?.id).toBe('2')
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
})
