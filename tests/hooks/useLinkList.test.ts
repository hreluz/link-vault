// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLinkList } from '@/lib/hooks/useLinkList'

const mockAddToast = vi.fn()

const { LINK_A, LINK_B, LINK_C } = vi.hoisted(() => {
  const LINK_A = {
    id: '1', title: 'Alpha Article', site_name: 'alpha.com',
    content_type: 'article' as const, status: 'unread' as const, is_favorite: false,
    tags: ['react'], created_at: '2026-01-01T00:00:00Z',
    url: 'https://alpha.com', description: '', notes: null,
  }
  const LINK_B = {
    id: '2', title: 'Beta Video', site_name: 'beta.com',
    content_type: 'youtube' as const, status: 'read' as const, is_favorite: true,
    tags: ['vue', 'css'], created_at: '2026-01-02T00:00:00Z',
    url: 'https://beta.com', description: '', notes: null,
  }
  const LINK_C = {
    id: '3', title: 'Gamma Article', site_name: 'gamma.com',
    content_type: 'article' as const, status: 'watching' as const, is_favorite: false,
    tags: ['react', 'css'], created_at: '2026-01-03T00:00:00Z',
    url: 'https://gamma.com', description: '', notes: null,
  }
  return { LINK_A, LINK_B, LINK_C }
})

vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

vi.mock('@/lib/mock-data', () => ({
  MOCK_LINKS: [LINK_A, LINK_B, LINK_C],
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useLinkList', () => {
  describe('initial state', () => {
    it('returns all links sorted newest first by default', () => {
      const { result } = renderHook(() => useLinkList())
      expect(result.current.results.map(l => l.id)).toEqual(['3', '2', '1'])
    })

    it('has no active filters by default', () => {
      const { result } = renderHook(() => useLinkList())
      expect(result.current.activeFilterCount).toBe(0)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('has modals closed by default', () => {
      const { result } = renderHook(() => useLinkList())
      expect(result.current.modalOpen).toBe(false)
      expect(result.current.filterOpen).toBe(false)
    })
  })

  describe('handleStatusChange', () => {
    it('updates the status of the target link', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.handleStatusChange('1', 'read'))

      const updated = result.current.results.find(l => l.id === '1')
      expect(updated?.status).toBe('read')
    })

    it('updates activeLink status when it is the target', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setActiveLink(LINK_A))
      act(() => result.current.handleStatusChange('1', 'favorite'))

      expect(result.current.activeLink?.status).toBe('favorite')
    })

    it('calls addToast with the new status label', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.handleStatusChange('1', 'watching'))

      expect(mockAddToast).toHaveBeenCalledWith('Moved to Watching')
    })
  })

  describe('handleEdit', () => {
    it('replaces the edited link in the list', () => {
      const { result } = renderHook(() => useLinkList())
      const updated = { ...LINK_A, title: 'Updated Title' }

      act(() => result.current.handleEdit(updated))

      const found = result.current.results.find(l => l.id === '1')
      expect(found?.title).toBe('Updated Title')
    })

    it('clears editingLink after save', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setEditingLink(LINK_A))
      act(() => result.current.handleEdit({ ...LINK_A, title: 'Updated' }))

      expect(result.current.editingLink).toBeNull()
    })

    it('calls addToast on save', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.handleEdit(LINK_A))

      expect(mockAddToast).toHaveBeenCalledWith('Changes saved')
    })
  })

  describe('handleDelete', () => {
    it('removes the active link from the list', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setActiveLink(LINK_B))
      act(() => result.current.handleDelete())

      expect(result.current.results.find(l => l.id === '2')).toBeUndefined()
    })

    it('clears activeLink after deletion', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setActiveLink(LINK_A))
      act(() => result.current.handleDelete())

      expect(result.current.activeLink).toBeNull()
    })

    it('does nothing when activeLink is null', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.handleDelete())

      expect(result.current.results).toHaveLength(3)
    })

    it('calls addToast with destructive variant', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setActiveLink(LINK_A))
      act(() => result.current.handleDelete())

      expect(mockAddToast).toHaveBeenCalledWith('Link deleted', 'destructive')
    })
  })

  describe('handleFavoriteToggle', () => {
    it('toggles is_favorite on the target link', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.handleFavoriteToggle('1'))

      expect(result.current.results.find(l => l.id === '1')?.is_favorite).toBe(true)
    })

    it('toasts "Added to favorites" when not yet favorited', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.handleFavoriteToggle('1'))

      expect(mockAddToast).toHaveBeenCalledWith('Added to favorites')
    })

    it('toasts "Removed from favorites" when already favorited', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.handleFavoriteToggle('2'))

      expect(mockAddToast).toHaveBeenCalledWith('Removed from favorites')
    })

    it('syncs activeLink when it is the target', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setActiveLink(LINK_A))
      act(() => result.current.handleFavoriteToggle('1'))

      expect(result.current.activeLink?.is_favorite).toBe(true)
    })
  })

  describe('resetFilters', () => {
    it('clears all active filters', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => {
        result.current.setCategory('article')
        result.current.setSelectedStatuses(['read'])
        result.current.setSelectedTags(['react'])
        result.current.setSortBy('oldest')
        result.current.setSearchQuery('something')
      })
      act(() => result.current.resetFilters())

      expect(result.current.category).toBe('all')
      expect(result.current.selectedStatuses).toEqual([])
      expect(result.current.selectedTags).toEqual([])
      expect(result.current.sortBy).toBe('newest')
      expect(result.current.searchQuery).toBe('')
      expect(result.current.activeFilterCount).toBe(0)
    })
  })

  describe('filtering', () => {
    it('filters by content type (category)', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setCategory('youtube'))

      expect(result.current.results.map(l => l.id)).toEqual(['2'])
    })

    it('filters by status', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSelectedStatuses(['unread']))

      expect(result.current.results.map(l => l.id)).toEqual(['1'])
    })

    it('filters by multiple statuses', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSelectedStatuses(['unread', 'watching']))

      expect(result.current.results.map(l => l.id)).toEqual(['3', '1'])
    })

    it('filters by tags in "any" mode', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => {
        result.current.setTagMode('any')
        result.current.setSelectedTags(['react', 'vue'])
      })

      // LINK_A has react, LINK_B has vue, LINK_C has react
      expect(result.current.results.map(l => l.id)).toEqual(['3', '2', '1'])
    })

    it('filters by tags in "all" mode', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => {
        result.current.setTagMode('all')
        result.current.setSelectedTags(['react', 'css'])
      })

      // Only LINK_C has both
      expect(result.current.results.map(l => l.id)).toEqual(['3'])
    })
  })

  describe('search', () => {
    it('filters by title text', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSearchQuery('alpha'))

      expect(result.current.results.map(l => l.id)).toEqual(['1'])
    })

    it('filters by site_name', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSearchQuery('beta.com'))

      expect(result.current.results.map(l => l.id)).toEqual(['2'])
    })

    it('filters by plain tag text', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSearchQuery('vue'))

      expect(result.current.results.map(l => l.id)).toEqual(['2'])
    })

    it('filters by #hashtag', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSearchQuery('#react'))

      expect(result.current.results.map(l => l.id)).toEqual(['3', '1'])
      expect(result.current.isHashTagSearch).toBe(true)
    })

    it('combines #hashtag and plain text', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSearchQuery('#react alpha'))

      // must match tag "react" AND title "alpha"
      expect(result.current.results.map(l => l.id)).toEqual(['1'])
    })

    it('marks isHashTagSearch false for plain queries', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSearchQuery('alpha'))

      expect(result.current.isHashTagSearch).toBe(false)
    })

    it('counts search as an active filter', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSearchQuery('alpha'))

      expect(result.current.hasActiveFilters).toBe(true)
    })
  })

  describe('sorting', () => {
    it('sorts oldest first', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSortBy('oldest'))

      expect(result.current.results.map(l => l.id)).toEqual(['1', '2', '3'])
    })

    it('sorts alphabetically', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSortBy('alphabetical'))

      expect(result.current.results.map(l => l.id)).toEqual(['1', '2', '3'])
    })

    it('sorts by status order', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSortBy('status'))

      // unread(0) < watching(1) < read(2)
      expect(result.current.results.map(l => l.id)).toEqual(['1', '3', '2'])
    })

    it('non-default sort counts toward activeFilterCount', () => {
      const { result } = renderHook(() => useLinkList())

      act(() => result.current.setSortBy('alphabetical'))

      expect(result.current.activeFilterCount).toBe(1)
    })
  })
})
