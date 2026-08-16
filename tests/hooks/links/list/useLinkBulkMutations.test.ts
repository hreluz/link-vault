// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useLinkBulkMutations } from '@/lib/hooks/links/list/useLinkBulkMutations'
import type { LinkWithTags, LinkFilterParams } from '@/lib/services/links'

const mockAddToast = vi.fn()
const FAKE_DEK = { fake: true } as unknown as CryptoKey

const { LINK_A, LINK_B, LINK_C } = vi.hoisted(() => {
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
  const LINK_C: LinkWithTags = {
    id: '3', title: 'Gamma', site_name: 'gamma.com',
    status: 'unread', is_favorite: false, deleted_at: null, image_url: null, duration: null,
    tags: [], created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z',
    url: 'https://gamma.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  return { LINK_A, LINK_B, LINK_C }
})

const FILTER_PARAMS: LinkFilterParams = {
  textSearch: '', categoryId: null, statuses: [], tagIds: [], tagMode: 'any',
  favoritesOnly: false, sortBy: 'newest', unlockedTagIds: [],
}

vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

vi.mock('@/lib/services/links', () => ({
  bulkUpdateStatus: vi.fn(),
  bulkSoftDelete: vi.fn(),
  bulkUpdateCategory: vi.fn(),
  bulkAddTags: vi.fn(),
}))

const mockRefetchTags = vi.fn()
vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: mockRefetchTags }),
}))

import { bulkUpdateStatus, bulkSoftDelete, bulkUpdateCategory, bulkAddTags } from '@/lib/services/links'
const mockBulkUpdateStatus = vi.mocked(bulkUpdateStatus)
const mockBulkSoftDelete = vi.mocked(bulkSoftDelete)
const mockBulkUpdateCategory = vi.mocked(bulkUpdateCategory)
const mockBulkAddTags = vi.mocked(bulkAddTags)

function useHarness(
  initial: LinkWithTags[] = [LINK_A, LINK_B],
  params: LinkFilterParams = FILTER_PARAMS,
  dek: CryptoKey | null = FAKE_DEK,
) {
  const [rawLinks, setRawLinks] = useState<LinkWithTags[]>(initial)
  return { rawLinks, ...useLinkBulkMutations(rawLinks, setRawLinks, params, dek) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAddToast.mockReturnValue('toast-id')
  mockBulkUpdateStatus.mockResolvedValue(true)
  mockBulkSoftDelete.mockResolvedValue(true)
  mockBulkUpdateCategory.mockResolvedValue(true)
  mockBulkAddTags.mockImplementation(async (_ids, names) => names)
})

describe('useLinkBulkMutations', () => {
  describe('handleBulkStatusChange', () => {
    it('updates status for all matching links immediately', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkStatusChange(['1', '2'], 'archived') })

      expect(result.current.rawLinks.find(l => l.id === '1')?.status).toBe('archived')
      expect(result.current.rawLinks.find(l => l.id === '2')?.status).toBe('archived')
    })

    it('leaves non-matching links unchanged', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B, LINK_C]))

      await act(async () => { await result.current.handleBulkStatusChange(['1'], 'archived') })

      expect(result.current.rawLinks.find(l => l.id === '2')?.status).toBe('read')
      expect(result.current.rawLinks.find(l => l.id === '3')?.status).toBe('unread')
    })

    it('calls bulkUpdateStatus with correct ids and status', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkStatusChange(['1', '2'], 'archived') })

      expect(mockBulkUpdateStatus).toHaveBeenCalledWith(['1', '2'], 'archived')
    })

    it('rolls back all statuses on service failure', async () => {
      mockBulkUpdateStatus.mockResolvedValue(false)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkStatusChange(['1', '2'], 'archived') })

      expect(result.current.rawLinks.find(l => l.id === '1')?.status).toBe('unread')
      expect(result.current.rawLinks.find(l => l.id === '2')?.status).toBe('read')
    })

    it('toasts an error on failure', async () => {
      mockBulkUpdateStatus.mockResolvedValue(false)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkStatusChange(['1'], 'archived') })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to update links', 'destructive')
    })
  })

  describe('handleBulkDelete', () => {
    it('removes all matching links immediately', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkDelete(['1', '2']) })

      expect(result.current.rawLinks).toHaveLength(0)
    })

    it('leaves non-matching links in place', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkDelete(['1']) })

      expect(result.current.rawLinks).toHaveLength(1)
      expect(result.current.rawLinks[0].id).toBe('2')
    })

    it('calls bulkSoftDelete immediately (no undo timer)', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkDelete(['1']) })

      expect(mockBulkSoftDelete).toHaveBeenCalledWith(['1'])
    })

    it('toasts a success message with the correct count', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkDelete(['1', '2']) })

      expect(mockAddToast).toHaveBeenCalledWith('2 links deleted')
    })

    it('uses singular "link" when deleting one', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkDelete(['1']) })

      expect(mockAddToast).toHaveBeenCalledWith('1 link deleted')
    })

    it('restores all links on service failure', async () => {
      mockBulkSoftDelete.mockResolvedValue(false)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkDelete(['1', '2']) })

      expect(result.current.rawLinks).toHaveLength(2)
    })

    it('toasts an error on failure', async () => {
      mockBulkSoftDelete.mockResolvedValue(false)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkDelete(['1']) })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to delete links', 'destructive')
    })
  })

  describe('handleBulkCategoryChange', () => {
    it('updates category_id for all matching links immediately', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkCategoryChange(['1', '2'], 'cat-new') })

      expect(result.current.rawLinks.find(l => l.id === '1')?.category_id).toBe('cat-new')
      expect(result.current.rawLinks.find(l => l.id === '2')?.category_id).toBe('cat-new')
    })

    it('calls bulkUpdateCategory with correct ids and categoryId', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkCategoryChange(['1'], 'cat-xyz') })

      expect(mockBulkUpdateCategory).toHaveBeenCalledWith(['1'], 'cat-xyz')
    })

    it('rolls back category_id on service failure', async () => {
      mockBulkUpdateCategory.mockResolvedValue(false)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkCategoryChange(['1'], 'cat-new') })

      expect(result.current.rawLinks.find(l => l.id === '1')?.category_id).toBeNull()
    })

    it('toasts an error on failure', async () => {
      mockBulkUpdateCategory.mockResolvedValue(false)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkCategoryChange(['1'], 'cat-new') })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to update category', 'destructive')
    })
  })

  describe('handleBulkAddTags', () => {
    it('appends the resolved tag ids to all matching links', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkAddTags(['1', '2'], ['ts', 'node']) })

      expect(result.current.rawLinks.find(l => l.id === '1')?.tags).toContain('ts')
      expect(result.current.rawLinks.find(l => l.id === '2')?.tags).toContain('ts')
    })

    it('preserves existing tags', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['ts']) })

      expect(result.current.rawLinks.find(l => l.id === '1')?.tags).toContain('react')
    })

    it('deduplicates tags when the link already has the tag', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['react']) })

      const tags = result.current.rawLinks.find(l => l.id === '1')?.tags ?? []
      expect(tags.filter(t => t === 'react')).toHaveLength(1)
    })

    it('calls bulkAddTags with correct ids, tag names, and the vault key', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkAddTags(['1', '2'], ['node']) })

      expect(mockBulkAddTags).toHaveBeenCalledWith(['1', '2'], ['node'], FAKE_DEK)
    })

    it('refetches the shared tags cache on success', async () => {
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['new-tag']) })

      expect(mockRefetchTags).toHaveBeenCalledOnce()
    })

    it('does not refetch the shared tags cache on failure', async () => {
      mockBulkAddTags.mockResolvedValue(null)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['new-tag']) })

      expect(mockRefetchTags).not.toHaveBeenCalled()
    })

    it('does not modify links on service failure', async () => {
      mockBulkAddTags.mockResolvedValue(null)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['new-tag']) })

      expect(result.current.rawLinks.find(l => l.id === '1')?.tags).not.toContain('new-tag')
    })

    it('toasts an error on failure', async () => {
      mockBulkAddTags.mockResolvedValue(null)
      const { result } = renderHook(() => useHarness())

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['new-tag']) })

      expect(mockAddToast).toHaveBeenCalledWith('Failed to add tags', 'destructive')
    })

    it('does not call bulkAddTags when dek is null', async () => {
      const { result } = renderHook(() => useHarness([LINK_A, LINK_B], FILTER_PARAMS, null))

      await act(async () => { await result.current.handleBulkAddTags(['1'], ['new-tag']) })

      expect(mockBulkAddTags).not.toHaveBeenCalled()
    })
  })
})
