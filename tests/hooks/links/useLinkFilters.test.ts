// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLinkFilters } from '@/lib/hooks/links/useLinkFilters'

const BASE = { user_id: 'user-1', image_url: null, description: '', notes: null, updated_at: '2026-01-01T00:00:00Z', category_id: null }

const LINK_A = {
  ...BASE, id: '1', title: 'Alpha Article', site_name: 'alpha.com',
  content_type: 'article' as const, status: 'unread' as const, is_favorite: false,
  tags: ['react'], created_at: '2026-01-01T00:00:00Z', url: 'https://alpha.com',
}
const LINK_B = {
  ...BASE, id: '2', title: 'Beta Video', site_name: 'beta.com',
  content_type: 'youtube' as const, status: 'read' as const, is_favorite: true,
  tags: ['vue', 'css'], created_at: '2026-01-02T00:00:00Z', url: 'https://beta.com',
}
const LINK_C = {
  ...BASE, id: '3', title: 'Gamma Article', site_name: 'gamma.com',
  content_type: 'article' as const, status: 'watching' as const, is_favorite: false,
  tags: ['react', 'css'], created_at: '2026-01-03T00:00:00Z', url: 'https://gamma.com',
}

const ALL_LINKS = [LINK_A, LINK_B, LINK_C]

function renderFilters() {
  return renderHook(() => useLinkFilters(ALL_LINKS))
}

describe('useLinkFilters', () => {
  describe('initial state', () => {
    it('returns all links sorted newest first', () => {
      const { result } = renderFilters()
      expect(result.current.results.map(l => l.id)).toEqual(['3', '2', '1'])
    })

    it('has no active filters', () => {
      const { result } = renderFilters()
      expect(result.current.activeFilterCount).toBe(0)
      expect(result.current.hasActiveFilters).toBe(false)
      expect(result.current.isHashTagSearch).toBe(false)
    })
  })

  describe('category filter', () => {
    it('filters by content type', () => {
      const { result } = renderFilters()

      act(() => result.current.setCategory('youtube'))

      expect(result.current.results.map(l => l.id)).toEqual(['2'])
    })

    it('counts category filter toward activeFilterCount', () => {
      const { result } = renderFilters()

      act(() => result.current.setCategory('article'))

      expect(result.current.activeFilterCount).toBe(1)
    })
  })

  describe('status filter', () => {
    it('filters by a single status', () => {
      const { result } = renderFilters()

      act(() => result.current.setSelectedStatuses(['unread']))

      expect(result.current.results.map(l => l.id)).toEqual(['1'])
    })

    it('filters by multiple statuses', () => {
      const { result } = renderFilters()

      act(() => result.current.setSelectedStatuses(['unread', 'watching']))

      expect(result.current.results.map(l => l.id)).toEqual(['3', '1'])
    })

    it('each selected status counts individually', () => {
      const { result } = renderFilters()

      act(() => result.current.setSelectedStatuses(['unread', 'read']))

      expect(result.current.activeFilterCount).toBe(2)
    })
  })

  describe('tag filter', () => {
    it('filters by tags in "any" mode', () => {
      const { result } = renderFilters()

      act(() => {
        result.current.setTagMode('any')
        result.current.setSelectedTags(['react', 'vue'])
      })

      expect(result.current.results.map(l => l.id)).toEqual(['3', '2', '1'])
    })

    it('filters by tags in "all" mode', () => {
      const { result } = renderFilters()

      act(() => {
        result.current.setTagMode('all')
        result.current.setSelectedTags(['react', 'css'])
      })

      // Only LINK_C has both
      expect(result.current.results.map(l => l.id)).toEqual(['3'])
    })

    it('each selected tag counts individually', () => {
      const { result } = renderFilters()

      act(() => result.current.setSelectedTags(['react', 'css']))

      expect(result.current.activeFilterCount).toBe(2)
    })
  })

  describe('search', () => {
    it('filters by title text', () => {
      const { result } = renderFilters()

      act(() => result.current.setSearchQuery('alpha'))

      expect(result.current.results.map(l => l.id)).toEqual(['1'])
    })

    it('filters by site_name', () => {
      const { result } = renderFilters()

      act(() => result.current.setSearchQuery('beta.com'))

      expect(result.current.results.map(l => l.id)).toEqual(['2'])
    })

    it('filters by plain tag text', () => {
      const { result } = renderFilters()

      act(() => result.current.setSearchQuery('vue'))

      expect(result.current.results.map(l => l.id)).toEqual(['2'])
    })

    it('filters by #hashtag and sets isHashTagSearch', () => {
      const { result } = renderFilters()

      act(() => result.current.setSearchQuery('#react'))

      expect(result.current.results.map(l => l.id)).toEqual(['3', '1'])
      expect(result.current.isHashTagSearch).toBe(true)
    })

    it('combines #hashtag and plain text with AND logic', () => {
      const { result } = renderFilters()

      act(() => result.current.setSearchQuery('#react alpha'))

      expect(result.current.results.map(l => l.id)).toEqual(['1'])
    })

    it('counts a non-empty search query as an active filter', () => {
      const { result } = renderFilters()

      act(() => result.current.setSearchQuery('alpha'))

      expect(result.current.hasActiveFilters).toBe(true)
      expect(result.current.activeFilterCount).toBe(0) // search doesn't increment the count, only hasActiveFilters
    })
  })

  describe('sorting', () => {
    it('sorts oldest first', () => {
      const { result } = renderFilters()

      act(() => result.current.setSortBy('oldest'))

      expect(result.current.results.map(l => l.id)).toEqual(['1', '2', '3'])
    })

    it('sorts alphabetically', () => {
      const { result } = renderFilters()

      act(() => result.current.setSortBy('alphabetical'))

      expect(result.current.results.map(l => l.id)).toEqual(['1', '2', '3'])
    })

    it('sorts by status order', () => {
      const { result } = renderFilters()

      act(() => result.current.setSortBy('status'))

      // unread(0) < watching(1) < read(2)
      expect(result.current.results.map(l => l.id)).toEqual(['1', '3', '2'])
    })

    it('counts a non-default sort toward activeFilterCount', () => {
      const { result } = renderFilters()

      act(() => result.current.setSortBy('alphabetical'))

      expect(result.current.activeFilterCount).toBe(1)
    })
  })

  describe('allTags', () => {
    it('returns a sorted, deduplicated list of all tags across links', () => {
      const { result } = renderFilters()
      // LINK_A: ['react'], LINK_B: ['vue', 'css'], LINK_C: ['react', 'css']
      expect(result.current.allTags).toEqual(['css', 'react', 'vue'])
    })

    it('returns an empty array when no links have tags', () => {
      const { result } = renderHook(() => useLinkFilters([
        { ...LINK_A, tags: [] },
        { ...LINK_B, tags: [] },
      ]))
      expect(result.current.allTags).toEqual([])
    })
  })

  describe('resetFilters', () => {
    it('clears all active filters back to defaults', () => {
      const { result } = renderFilters()

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
      expect(result.current.tagMode).toBe('any')
      expect(result.current.sortBy).toBe('newest')
      expect(result.current.searchQuery).toBe('')
      expect(result.current.activeFilterCount).toBe(0)
      expect(result.current.hasActiveFilters).toBe(false)
    })
  })
})
