// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLinksSelection } from '@/lib/hooks/links/list/useLinksSelection'

describe('useLinksSelection', () => {
  describe('initial state', () => {
    it('starts with selection mode off', () => {
      const { result } = renderHook(() => useLinksSelection())
      expect(result.current.isSelectionMode).toBe(false)
    })

    it('starts with no selected ids', () => {
      const { result } = renderHook(() => useLinksSelection())
      expect(result.current.selectedCount).toBe(0)
    })

    it('starts with an empty selectedIds set', () => {
      const { result } = renderHook(() => useLinksSelection())
      expect(result.current.selectedIds.size).toBe(0)
    })
  })

  describe('enterSelectionMode', () => {
    it('activates selection mode', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.enterSelectionMode())
      expect(result.current.isSelectionMode).toBe(true)
    })
  })

  describe('exitSelectionMode', () => {
    it('deactivates selection mode', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.enterSelectionMode())
      act(() => result.current.exitSelectionMode())
      expect(result.current.isSelectionMode).toBe(false)
    })

    it('clears all selected ids', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => { result.current.enterSelectionMode(); result.current.toggleSelected('1') })
      act(() => result.current.exitSelectionMode())
      expect(result.current.selectedCount).toBe(0)
    })
  })

  describe('toggleSelected', () => {
    it('adds an id when not yet selected', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.toggleSelected('a'))
      expect(result.current.isSelected('a')).toBe(true)
      expect(result.current.selectedCount).toBe(1)
    })

    it('removes an id that is already selected', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.toggleSelected('a'))
      act(() => result.current.toggleSelected('a'))
      expect(result.current.isSelected('a')).toBe(false)
      expect(result.current.selectedCount).toBe(0)
    })

    it('can select multiple distinct ids independently', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => { result.current.toggleSelected('a'); result.current.toggleSelected('b') })
      expect(result.current.selectedCount).toBe(2)
      expect(result.current.isSelected('a')).toBe(true)
      expect(result.current.isSelected('b')).toBe(true)
    })

    it('removing one id does not affect others', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => { result.current.toggleSelected('a'); result.current.toggleSelected('b') })
      act(() => result.current.toggleSelected('a'))
      expect(result.current.isSelected('b')).toBe(true)
      expect(result.current.selectedCount).toBe(1)
    })
  })

  describe('selectAll', () => {
    it('selects all provided ids', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.selectAll(['x', 'y', 'z']))
      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isSelected('x')).toBe(true)
      expect(result.current.isSelected('y')).toBe(true)
      expect(result.current.isSelected('z')).toBe(true)
    })

    it('replaces any previously selected ids', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.toggleSelected('old'))
      act(() => result.current.selectAll(['new-1', 'new-2']))
      expect(result.current.isSelected('old')).toBe(false)
      expect(result.current.selectedCount).toBe(2)
    })

    it('handles an empty array by clearing the selection', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.toggleSelected('a'))
      act(() => result.current.selectAll([]))
      expect(result.current.selectedCount).toBe(0)
    })
  })

  describe('clearAll', () => {
    it('empties the selection', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.selectAll(['a', 'b', 'c']))
      act(() => result.current.clearAll())
      expect(result.current.selectedCount).toBe(0)
    })

    it('does not exit selection mode', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => { result.current.enterSelectionMode(); result.current.clearAll() })
      expect(result.current.isSelectionMode).toBe(true)
    })
  })

  describe('isSelected', () => {
    it('returns true for a selected id', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.toggleSelected('abc'))
      expect(result.current.isSelected('abc')).toBe(true)
    })

    it('returns false for an id that has not been selected', () => {
      const { result } = renderHook(() => useLinksSelection())
      expect(result.current.isSelected('xyz')).toBe(false)
    })

    it('returns false after an id is toggled off', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.toggleSelected('abc'))
      act(() => result.current.toggleSelected('abc'))
      expect(result.current.isSelected('abc')).toBe(false)
    })
  })

  describe('selectedCount', () => {
    it('reflects the current number of selected ids', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.selectAll(['1', '2', '3']))
      expect(result.current.selectedCount).toBe(3)
    })

    it('decrements when an id is toggled off', () => {
      const { result } = renderHook(() => useLinksSelection())
      act(() => result.current.selectAll(['1', '2']))
      act(() => result.current.toggleSelected('1'))
      expect(result.current.selectedCount).toBe(1)
    })
  })
})
