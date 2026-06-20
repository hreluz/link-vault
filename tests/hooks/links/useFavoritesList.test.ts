// @vitest-environment jsdom
// Integration tests for useFavoritesList — verifies composition of useFavorites + useLinkFilters.
// Detailed handler behavior is covered in useFavorites.test.ts and useLinkFilters.test.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFavoritesList } from '@/lib/hooks/links/useFavoritesList'
import type { LinkWithTags } from '@/lib/services/links'

const mockAddToast = vi.fn()

const { LINK_A, LINK_B, LINK_C } = vi.hoisted(() => {
  const base = {
    user_id: 'user-1', description: '', notes: null,
    is_favorite: true, url: 'https://example.com',
    image_url: null, deleted_at: null,
  }
  const LINK_A: LinkWithTags = {
    ...base, id: '1', title: 'Alpha', site_name: 'alpha.com',
    category_id: 'cat-1', status: 'unread', tags: ['react'],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  }
  const LINK_B: LinkWithTags = {
    ...base, id: '2', title: 'Beta', site_name: 'beta.com',
    category_id: 'cat-2', status: 'read', tags: ['vue'],
    created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
  }
  const LINK_C: LinkWithTags = {
    ...base, id: '3', title: 'Gamma', site_name: 'gamma.com',
    category_id: 'cat-1', status: 'watching', tags: ['react'],
    created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z',
  }
  return { LINK_A, LINK_B, LINK_C }
})

vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

vi.mock('@/lib/services/favorites', () => ({
  getFavorites: vi.fn(),
}))

vi.mock('@/lib/services/links', () => ({
  toggleLinkFavorite: vi.fn(),
  deleteLink: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/services/tags', () => ({
  getPrivateTagNames: vi.fn(),
}))

const mockUseUnlockedTags = vi.fn()
vi.mock('@/lib/context/UnlockedTagsContext', () => ({
  useUnlockedTags: () => mockUseUnlockedTags(),
}))

import { getFavorites } from '@/lib/services/favorites'
import { getPrivateTagNames } from '@/lib/services/tags'
const mockGetFavorites = vi.mocked(getFavorites)
const mockGetPrivateTagNames = vi.mocked(getPrivateTagNames)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetFavorites.mockResolvedValue([LINK_A, LINK_B, LINK_C])
  mockGetPrivateTagNames.mockResolvedValue([])
  mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
})

async function renderLoaded() {
  const utils = renderHook(() => useFavoritesList())
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useFavoritesList (integration)', () => {
  describe('loading state', () => {
    it('starts in loading state with no links', () => {
      const { result } = renderHook(() => useFavoritesList())

      expect(result.current.loading).toBe(true)
      expect(result.current.links).toHaveLength(0)
    })

    it('loads favorites and clears loading', async () => {
      const { result } = await renderLoaded()

      expect(result.current.loading).toBe(false)
      expect(result.current.links).toHaveLength(3)
    })
  })

  describe('filters wired to links', () => {
    it('results equal all links with no active filters', async () => {
      const { result } = await renderLoaded()

      expect(result.current.results).toHaveLength(3)
    })

    it('results reflect category filter', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setCategory('cat-1'))

      expect(result.current.results.map(l => l.id)).toEqual(['3', '1'])
    })

    it('results reflect status filter', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setSelectedStatuses(['read']))

      expect(result.current.results.map(l => l.id)).toEqual(['2'])
    })

    it('results reflect search query', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setSearchQuery('alpha'))

      expect(result.current.results.map(l => l.id)).toEqual(['1'])
    })

    it('resetFilters restores all results', async () => {
      const { result } = await renderLoaded()
      act(() => result.current.setCategory('cat-2'))

      act(() => result.current.resetFilters())

      expect(result.current.results).toHaveLength(3)
    })
  })

  describe('filterOpen state', () => {
    it('starts closed', async () => {
      const { result } = await renderLoaded()

      expect(result.current.filterOpen).toBe(false)
    })

    it('can be opened and closed', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setFilterOpen(true))
      expect(result.current.filterOpen).toBe(true)

      act(() => result.current.setFilterOpen(false))
      expect(result.current.filterOpen).toBe(false)
    })
  })

  describe('activeLink state', () => {
    it('starts as null', async () => {
      const { result } = await renderLoaded()

      expect(result.current.activeLink).toBeNull()
    })

    it('can be set and cleared', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setActiveLink(LINK_A))
      expect(result.current.activeLink?.id).toBe('1')

      act(() => result.current.setActiveLink(null))
      expect(result.current.activeLink).toBeNull()
    })
  })

  describe('editingLink state', () => {
    it('starts as null', async () => {
      const { result } = await renderLoaded()

      expect(result.current.editingLink).toBeNull()
    })

    it('can be set and cleared', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.setEditingLink(LINK_B))
      expect(result.current.editingLink?.id).toBe('2')

      act(() => result.current.setEditingLink(null))
      expect(result.current.editingLink).toBeNull()
    })
  })

  describe('handlers', () => {
    it('handleStatusChange updates the link in results', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleStatusChange('1', 'read'))

      expect(result.current.links.find(l => l.id === '1')?.status).toBe('read')
    })

    it('handleEdit updates the link in results', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleEdit({ ...LINK_A, title: 'Updated' }))

      expect(result.current.links.find(l => l.id === '1')?.title).toBe('Updated')
    })

    it('handleDelete removes the link from results', async () => {
      const { result } = await renderLoaded()

      await act(async () => { await result.current.handleDelete('1') })

      expect(result.current.links.find(l => l.id === '1')).toBeUndefined()
    })
  })
})
