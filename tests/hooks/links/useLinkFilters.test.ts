// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLinkFilters } from '@/lib/hooks/links/useLinkFilters'

const mockUseUnlockedTags = vi.fn()
vi.mock('@/lib/context/UnlockedTagsContext', () => ({
  useUnlockedTags: () => mockUseUnlockedTags(),
}))

const mockUseTagsContext = vi.fn()
vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => mockUseTagsContext(),
}))

beforeEach(() => {
  mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
  mockUseTagsContext.mockReturnValue({ tags: [], loading: false, refetchTags: vi.fn() })
})

describe('useLinkFilters', () => {
  describe('initial state', () => {
    it('defaults to no filters and newest-first sort', () => {
      const { result } = renderHook(() => useLinkFilters())
      expect(result.current.category).toBe('all')
      expect(result.current.searchQuery).toBe('')
      expect(result.current.selectedTagIds).toEqual([])
      expect(result.current.tagMode).toBe('any')
      expect(result.current.selectedStatuses).toEqual([])
      expect(result.current.sortBy).toBe('newest')
      expect(result.current.favoritesOnly).toBe(false)
      expect(result.current.activeFilterCount).toBe(0)
      expect(result.current.hasActiveFilters).toBe(false)
      expect(result.current.isHashTagSearch).toBe(false)
    })

    it('derives an initial filterParams matching the default state', () => {
      const { result } = renderHook(() => useLinkFilters())
      expect(result.current.filterParams).toEqual({
        textSearch: '', categoryId: null, statuses: [], tagIds: [], tagMode: 'any',
        favoritesOnly: false, sortBy: 'newest', unlockedTagIds: [],
      })
    })
  })

  describe('filterParams derivation', () => {
    it('maps category "all" to a null categoryId', () => {
      const { result } = renderHook(() => useLinkFilters())
      act(() => result.current.setCategory('cat-article'))
      expect(result.current.filterParams.categoryId).toBe('cat-article')

      act(() => result.current.setCategory('all'))
      expect(result.current.filterParams.categoryId).toBeNull()
    })

    it('reflects selected statuses, tag ids, tagMode, favoritesOnly, and sortBy', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => {
        result.current.setSelectedStatuses(['unread', 'watching'])
        result.current.setSelectedTagIds(['tag-react', 'tag-css'])
        result.current.setTagMode('all')
        result.current.setFavoritesOnly(true)
        result.current.setSortBy('alphabetical')
      })

      expect(result.current.filterParams).toMatchObject({
        statuses: ['unread', 'watching'],
        tagIds: ['tag-react', 'tag-css'],
        tagMode: 'all',
        favoritesOnly: true,
        sortBy: 'alphabetical',
      })
    })

    it('includes unlockedTagIds from the private-tags context as an array', () => {
      mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(['secret-id']), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = renderHook(() => useLinkFilters())
      expect(result.current.filterParams.unlockedTagIds).toEqual(['secret-id'])
    })

    it('resolves a #tag token in the search box to its tag id and folds it into tagIds', () => {
      mockUseTagsContext.mockReturnValue({
        tags: [{ id: 'tag-react', name: 'react', color: null, is_private: false, created_at: '', link_count: 0 }],
        loading: false,
        refetchTags: vi.fn(),
      })
      vi.useFakeTimers()
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSearchQuery('#react'))
      act(() => { vi.advanceTimersByTime(350) })

      expect(result.current.filterParams.tagIds).toEqual(['tag-react'])
      expect(result.current.filterParams.textSearch).toBe('')
      vi.useRealTimers()
    })
  })

  describe('search debounce', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('does not update filterParams.textSearch immediately on keystroke', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSearchQuery('alpha'))

      expect(result.current.filterParams.textSearch).toBe('')
    })

    it('updates filterParams.textSearch ~350ms after the last keystroke', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSearchQuery('alpha'))
      act(() => { vi.advanceTimersByTime(350) })

      expect(result.current.filterParams.textSearch).toBe('alpha')
    })

    it('trims whitespace from the debounced search value', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSearchQuery('  alpha  '))
      act(() => { vi.advanceTimersByTime(350) })

      expect(result.current.filterParams.textSearch).toBe('alpha')
    })

    it('resets the debounce timer on each keystroke', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSearchQuery('al'))
      act(() => { vi.advanceTimersByTime(200) })
      act(() => result.current.setSearchQuery('alpha'))
      act(() => { vi.advanceTimersByTime(200) })

      expect(result.current.filterParams.textSearch).toBe('')

      act(() => { vi.advanceTimersByTime(150) })
      expect(result.current.filterParams.textSearch).toBe('alpha')
    })

    it('updates hasActiveFilters/isHashTagSearch immediately, without waiting for the debounce', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSearchQuery('#react'))

      expect(result.current.hasActiveFilters).toBe(true)
      expect(result.current.isHashTagSearch).toBe(true)
    })
  })

  describe('activeFilterCount / hasActiveFilters', () => {
    it('counts a non-default sort toward activeFilterCount', () => {
      const { result } = renderHook(() => useLinkFilters())
      act(() => result.current.setSortBy('alphabetical'))
      expect(result.current.activeFilterCount).toBe(1)
    })

    it('counts an active category toward activeFilterCount', () => {
      const { result } = renderHook(() => useLinkFilters())
      act(() => result.current.setCategory('cat-article'))
      expect(result.current.activeFilterCount).toBe(1)
    })

    it('counts each selected tag individually', () => {
      const { result } = renderHook(() => useLinkFilters())
      act(() => result.current.setSelectedTagIds(['tag-react', 'tag-css']))
      expect(result.current.activeFilterCount).toBe(2)
    })

    it('does not count selected statuses or favoritesOnly toward activeFilterCount, but they set hasActiveFilters', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSelectedStatuses(['unread']))
      expect(result.current.activeFilterCount).toBe(0)
      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('has no active filters by default', () => {
      const { result } = renderHook(() => useLinkFilters())
      expect(result.current.activeFilterCount).toBe(0)
      expect(result.current.hasActiveFilters).toBe(false)
    })
  })

  describe('resetFilters', () => {
    it('clears all active filters back to defaults', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => {
        result.current.setCategory('cat-article')
        result.current.setSelectedStatuses(['read'])
        result.current.setSelectedTagIds(['tag-react'])
        result.current.setSortBy('oldest')
        result.current.setSearchQuery('something')
      })
      act(() => result.current.resetFilters())

      expect(result.current.category).toBe('all')
      expect(result.current.selectedStatuses).toEqual([])
      expect(result.current.selectedTagIds).toEqual([])
      expect(result.current.tagMode).toBe('any')
      expect(result.current.sortBy).toBe('newest')
      expect(result.current.searchQuery).toBe('')
      expect(result.current.activeFilterCount).toBe(0)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('does not clear favoritesOnly, since it is a view mode rather than a filter', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setFavoritesOnly(true))
      act(() => result.current.resetFilters())

      expect(result.current.favoritesOnly).toBe(true)
    })
  })
})
