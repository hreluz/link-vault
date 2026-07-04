// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLinkFilters } from '@/lib/hooks/links/useLinkFilters'

const mockUseUnlockedTags = vi.fn()
vi.mock('@/lib/context/UnlockedTagsContext', () => ({
  useUnlockedTags: () => mockUseUnlockedTags(),
}))

beforeEach(() => {
  mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
})

describe('useLinkFilters', () => {
  describe('initial state', () => {
    it('defaults to no filters and newest-first sort', () => {
      const { result } = renderHook(() => useLinkFilters())
      expect(result.current.category).toBe('all')
      expect(result.current.searchQuery).toBe('')
      expect(result.current.selectedTags).toEqual([])
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
        search: '', categoryId: null, statuses: [], tagNames: [], tagMode: 'any',
        favoritesOnly: false, sortBy: 'newest', unlockedTagNames: [],
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

    it('reflects selected statuses, tags, tagMode, favoritesOnly, and sortBy', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => {
        result.current.setSelectedStatuses(['unread', 'watching'])
        result.current.setSelectedTags(['react', 'css'])
        result.current.setTagMode('all')
        result.current.setFavoritesOnly(true)
        result.current.setSortBy('alphabetical')
      })

      expect(result.current.filterParams).toMatchObject({
        statuses: ['unread', 'watching'],
        tagNames: ['react', 'css'],
        tagMode: 'all',
        favoritesOnly: true,
        sortBy: 'alphabetical',
      })
    })

    it('includes unlockedTagNames from the private-tags context as an array', () => {
      mockUseUnlockedTags.mockReturnValue({ unlockedTagNames: new Set(['secret']), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
      const { result } = renderHook(() => useLinkFilters())
      expect(result.current.filterParams.unlockedTagNames).toEqual(['secret'])
    })
  })

  describe('search debounce', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('does not update filterParams.search immediately on keystroke', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSearchQuery('alpha'))

      expect(result.current.filterParams.search).toBe('')
    })

    it('updates filterParams.search ~350ms after the last keystroke', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSearchQuery('alpha'))
      act(() => { vi.advanceTimersByTime(350) })

      expect(result.current.filterParams.search).toBe('alpha')
    })

    it('trims whitespace from the debounced search value', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSearchQuery('  alpha  '))
      act(() => { vi.advanceTimersByTime(350) })

      expect(result.current.filterParams.search).toBe('alpha')
    })

    it('resets the debounce timer on each keystroke', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setSearchQuery('al'))
      act(() => { vi.advanceTimersByTime(200) })
      act(() => result.current.setSearchQuery('alpha'))
      act(() => { vi.advanceTimersByTime(200) })

      expect(result.current.filterParams.search).toBe('')

      act(() => { vi.advanceTimersByTime(150) })
      expect(result.current.filterParams.search).toBe('alpha')
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
      act(() => result.current.setSelectedTags(['react', 'css']))
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

    it('does not clear favoritesOnly, since it is a view mode rather than a filter', () => {
      const { result } = renderHook(() => useLinkFilters())

      act(() => result.current.setFavoritesOnly(true))
      act(() => result.current.resetFilters())

      expect(result.current.favoritesOnly).toBe(true)
    })
  })
})
