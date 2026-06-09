// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLinks } from '@/lib/hooks/links/useLinks'
import type { LinkWithTags } from '@/lib/services/links'

const mockAddToast = vi.fn()

const { LINK_A, LINK_B } = vi.hoisted(() => {
  const LINK_A: LinkWithTags = {
    id: '1', title: 'Alpha', site_name: 'alpha.com',
    status: 'unread', is_favorite: false,
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

vi.mock('@/lib/services/links', () => ({
  getLinks: vi.fn(),
  toggleLinkFavorite: vi.fn(),
  deleteLink: vi.fn(),
}))

import { getLinks, toggleLinkFavorite, deleteLink } from '@/lib/services/links'
const mockGetLinks = vi.mocked(getLinks)
const mockToggleFavorite = vi.mocked(toggleLinkFavorite)
const mockDeleteLink = vi.mocked(deleteLink)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetLinks.mockResolvedValue([LINK_A, LINK_B])
  mockToggleFavorite.mockResolvedValue(true)
  mockDeleteLink.mockResolvedValue(true)
})

async function renderLoaded() {
  const utils = renderHook(() => useLinks())
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useLinks', () => {
  describe('initial state', () => {
    it('starts in loading state with no links', () => {
      const { result } = renderHook(() => useLinks())
      expect(result.current.loading).toBe(true)
      expect(result.current.links).toHaveLength(0)
    })

    it('loads links from the service and clears loading', async () => {
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

      await act(() => result.current.handleDelete('1'))

      expect(result.current.links.find(l => l.id === '1')).toBeUndefined()
    })

    it('leaves other links untouched', async () => {
      const { result } = await renderLoaded()

      await act(() => result.current.handleDelete('1'))

      expect(result.current.links).toHaveLength(1)
      expect(result.current.links[0].id).toBe('2')
    })

    it('calls deleteLink with the correct id', async () => {
      const { result } = await renderLoaded()

      await act(() => result.current.handleDelete('1'))

      expect(mockDeleteLink).toHaveBeenCalledWith('1')
    })

    it('calls addToast with destructive variant on success', async () => {
      const { result } = await renderLoaded()

      await act(() => result.current.handleDelete('2'))

      expect(mockAddToast).toHaveBeenCalledWith('Link deleted', 'destructive')
    })

    it('rolls back the optimistic removal on service failure', async () => {
      mockDeleteLink.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(() => result.current.handleDelete('1'))

      expect(result.current.links.some(l => l.id === '1')).toBe(true)
    })

    it('toasts an error on service failure', async () => {
      mockDeleteLink.mockResolvedValue(false)
      const { result } = await renderLoaded()

      await act(() => result.current.handleDelete('1'))

      expect(mockAddToast).toHaveBeenCalledWith('Failed to delete link', 'destructive')
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
  })

  describe('handleCreate', () => {
    it('prepends the new link to the list', async () => {
      const { result } = await renderLoaded()
      const newLink = { ...LINK_A, id: '99', title: 'New' }

      act(() => result.current.handleCreate(newLink))

      expect(result.current.links[0].id).toBe('99')
      expect(result.current.links).toHaveLength(3)
    })
  })
})
