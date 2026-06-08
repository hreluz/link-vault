// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFavorites } from '@/lib/hooks/links/useFavorites'
import type { LinkWithTags } from '@/lib/services/links'

const mockAddToast = vi.fn()

const { LINK_A, LINK_B } = vi.hoisted(() => {
  const LINK_A: LinkWithTags = {
    id: '1', title: 'Alpha', site_name: 'alpha.com',
    status: 'unread', is_favorite: true,
    tags: ['react'], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    url: 'https://alpha.com', description: '', notes: null, user_id: 'user-1', image_url: null, category_id: null,
  }
  const LINK_B: LinkWithTags = {
    id: '2', title: 'Beta', site_name: 'beta.com',
    status: 'read', is_favorite: true,
    tags: ['vue'], created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    url: 'https://beta.com', description: '', notes: null, user_id: 'user-1', image_url: null, category_id: null,
  }
  return { LINK_A, LINK_B }
})

vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

vi.mock('@/lib/services/favorites', () => ({
  getFavorites: vi.fn(),
}))

vi.mock('@/lib/services/links', () => ({
  toggleLinkFavorite: vi.fn(),
}))

import { getFavorites } from '@/lib/services/favorites'
import { toggleLinkFavorite } from '@/lib/services/links'
const mockGetFavorites = vi.mocked(getFavorites)
const mockToggleFavorite = vi.mocked(toggleLinkFavorite)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetFavorites.mockResolvedValue([LINK_A, LINK_B])
  mockToggleFavorite.mockResolvedValue(true)
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
  })

  describe('handleDelete', () => {
    it('removes the link by id', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleDelete('1'))

      expect(result.current.links.find(l => l.id === '1')).toBeUndefined()
    })

    it('leaves other links untouched', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleDelete('1'))

      expect(result.current.links).toHaveLength(1)
      expect(result.current.links[0].id).toBe('2')
    })

    it('calls addToast with destructive variant', async () => {
      const { result } = await renderLoaded()

      act(() => result.current.handleDelete('1'))

      expect(mockAddToast).toHaveBeenCalledWith('Link deleted', 'destructive')
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
