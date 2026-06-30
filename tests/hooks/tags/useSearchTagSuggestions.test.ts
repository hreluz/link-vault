// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSearchTagSuggestions } from '@/lib/hooks/tags/useSearchTagSuggestions'

const AVAILABLE = ['react', 'css', 'vue', 'frontend', 'backend', 'typescript', 'javascript', 'python', 'rust']

function render(query = '', onChange = vi.fn(), availableTags: string[] = []) {
  const utils = renderHook(
    ({ query, availableTags }) => useSearchTagSuggestions(query, onChange, availableTags),
    { initialProps: { query, availableTags } }
  )
  return { ...utils, onChange }
}

function press(result: { current: { onKeyPress: (key: string) => boolean } }, key: string) {
  let handled: boolean | undefined
  act(() => { handled = result.current.onKeyPress(key) })
  return handled
}

describe('useSearchTagSuggestions', () => {
  describe('suggestions', () => {
    it('returns empty suggestions when the query has no trailing #fragment', () => {
      const { result } = render('react tutorial', vi.fn(), AVAILABLE)
      expect(result.current.suggestions).toEqual([])
    })

    it('returns all matches when the fragment is just "#" (empty fragment)', () => {
      const { result } = render('#', vi.fn(), AVAILABLE)
      expect(result.current.suggestions.length).toBeGreaterThan(0)
    })

    it('matches the trailing fragment by substring, case-insensitively', () => {
      const { result } = render('#REA', vi.fn(), AVAILABLE)
      expect(result.current.suggestions).toContain('react')
    })

    it('only considers the trailing hashtag, ignoring earlier ones in the query', () => {
      const { result } = render('#css #rea', vi.fn(), AVAILABLE)
      expect(result.current.suggestions).toContain('react')
      expect(result.current.suggestions).not.toContain('css')
    })

    it('ignores a hashtag that is not at the end of the query', () => {
      const { result } = render('#css tutorial', vi.fn(), AVAILABLE)
      expect(result.current.suggestions).toEqual([])
    })

    it('limits suggestions to 8 results', () => {
      const many = Array.from({ length: 20 }, (_, i) => `tag-${i}`)
      const { result } = render('#tag', vi.fn(), many)
      expect(result.current.suggestions.length).toBeLessThanOrEqual(8)
    })

    it('returns empty suggestions when no availableTags provided', () => {
      const { result } = render('#rea')
      expect(result.current.suggestions).toEqual([])
    })
  })

  describe('keyboard navigation', () => {
    it('ArrowDown/ArrowUp move selectedIndex and return true when suggestions are open', () => {
      const { result } = render('#rea', vi.fn(), AVAILABLE)
      expect(press(result, 'ArrowDown')).toBe(true)
      expect(result.current.selectedIndex).toBe(0)
      expect(press(result, 'ArrowUp')).toBe(true)
      expect(result.current.selectedIndex).toBe(-1)
    })

    it('returns false for navigation keys when there is no active fragment', () => {
      const { result } = render('react tutorial', vi.fn(), AVAILABLE)
      expect(press(result, 'ArrowDown')).toBe(false)
      expect(press(result, 'Escape')).toBe(false)
    })

    it('Escape closes suggestions and returns true when open', () => {
      const { result } = render('#rea', vi.fn(), AVAILABLE)
      press(result, 'ArrowDown')
      expect(press(result, 'Escape')).toBe(true)
      expect(result.current.selectedIndex).toBe(-1)
    })

    it('Enter selects the highlighted suggestion', () => {
      const onChange = vi.fn()
      const { result } = render('hello #rea', onChange, AVAILABLE)
      press(result, 'ArrowDown')
      expect(press(result, 'Enter')).toBe(true)
      expect(onChange).toHaveBeenLastCalledWith('hello #react ')
    })

    it('Tab selects the highlighted suggestion', () => {
      const onChange = vi.fn()
      const { result } = render('#rea', onChange, AVAILABLE)
      press(result, 'ArrowDown')
      expect(press(result, 'Tab')).toBe(true)
      expect(onChange).toHaveBeenLastCalledWith('#react ')
    })

    it('Enter/Tab do nothing when no suggestion is highlighted', () => {
      const onChange = vi.fn()
      const { result } = render('#rea', onChange, AVAILABLE)
      expect(press(result, 'Enter')).toBe(false)
      expect(onChange).not.toHaveBeenCalled()
    })

    it('returns false for unrelated keys', () => {
      const { result } = render('#rea', vi.fn(), AVAILABLE)
      expect(press(result, 'a')).toBe(false)
    })
  })

  describe('selectSuggestion', () => {
    it('replaces the trailing fragment with the full tag name plus a trailing space', () => {
      const onChange = vi.fn()
      const { result } = render('check this #re', onChange, AVAILABLE)
      act(() => result.current.selectSuggestion('react'))
      expect(onChange).toHaveBeenCalledWith('check this #react ')
    })

    it('resets selectedIndex to -1', () => {
      const { result } = render('#re', vi.fn(), AVAILABLE)
      press(result, 'ArrowDown')
      act(() => result.current.selectSuggestion('react'))
      expect(result.current.selectedIndex).toBe(-1)
    })
  })

  describe('closeSuggestions', () => {
    it('resets selectedIndex to -1', () => {
      const { result } = render('#rea', vi.fn(), AVAILABLE)
      press(result, 'ArrowDown')
      act(() => result.current.closeSuggestions())
      expect(result.current.selectedIndex).toBe(-1)
    })
  })

  describe('selectedIndex reset on fragment change', () => {
    it('resets when the active fragment changes', () => {
      const { result, rerender } = render('#rea', vi.fn(), AVAILABLE)
      press(result, 'ArrowDown')
      expect(result.current.selectedIndex).toBe(0)
      rerender({ query: '#reac', availableTags: AVAILABLE })
      expect(result.current.selectedIndex).toBe(-1)
    })
  })
})
