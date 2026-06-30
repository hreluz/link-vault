// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTagInput } from '@/lib/hooks/links/useTagInput'

const AVAILABLE = ['react', 'css', 'vue', 'frontend', 'backend', 'typescript', 'javascript', 'python', 'rust']

function render(initialTags = '', onChange = vi.fn(), availableTags: string[] = []) {
  return { ...renderHook(() => useTagInput(initialTags, onChange, availableTags)), onChange }
}

describe('useTagInput', () => {
  describe('initial state', () => {
    it('starts with empty confirmed tags and empty input when no initial tags', () => {
      const { result } = render()
      expect(result.current.confirmedTags).toEqual([])
      expect(result.current.currentInput).toBe('')
    })

    it('parses comma-separated initial tags into confirmedTags', () => {
      const { result } = render('react, frontend, learning')
      expect(result.current.confirmedTags).toEqual(['react', 'frontend', 'learning'])
    })

    it('trims whitespace from initial tags', () => {
      const { result } = render('  react ,  css  ')
      expect(result.current.confirmedTags).toEqual(['react', 'css'])
    })

    it('filters empty entries from initial tags', () => {
      const { result } = render('react,,css,')
      expect(result.current.confirmedTags).toEqual(['react', 'css'])
    })
  })

  describe('onInputChange', () => {
    it('updates currentInput', () => {
      const { result, onChange } = render()
      act(() => result.current.onInputChange('reac'))
      expect(result.current.currentInput).toBe('reac')
      expect(onChange).toHaveBeenCalledWith('reac')
    })

    it('strips # characters from input', () => {
      const { result } = render()
      act(() => result.current.onInputChange('#react'))
      expect(result.current.currentInput).toBe('react')
    })

    it('strips commas from input', () => {
      const { result } = render()
      act(() => result.current.onInputChange('react,'))
      expect(result.current.currentInput).toBe('react')
    })

    it('includes currentInput in onChange when confirmed tags exist', () => {
      const { result, onChange } = render('css')
      act(() => result.current.onInputChange('react'))
      expect(onChange).toHaveBeenCalledWith('css, react')
    })
  })

  describe('onKeyPress — confirming tags', () => {
    it('comma confirms current input as a tag', () => {
      const { result, onChange } = render()
      act(() => result.current.onInputChange('react'))
      act(() => result.current.onKeyPress(','))
      expect(result.current.confirmedTags).toEqual(['react'])
      expect(result.current.currentInput).toBe('')
      expect(onChange).toHaveBeenLastCalledWith('react')
    })

    it('space confirms current input as a tag', () => {
      const { result } = render()
      act(() => result.current.onInputChange('react'))
      act(() => result.current.onKeyPress(' '))
      expect(result.current.confirmedTags).toEqual(['react'])
    })

    it('Enter confirms current input as a tag', () => {
      const { result } = render()
      act(() => result.current.onInputChange('react'))
      act(() => result.current.onKeyPress('Enter'))
      expect(result.current.confirmedTags).toEqual(['react'])
    })

    it('does not add an empty tag when confirming with blank input', () => {
      const { result } = render()
      act(() => result.current.onKeyPress(','))
      expect(result.current.confirmedTags).toEqual([])
    })

    it('does not add a whitespace-only tag', () => {
      const { result } = render()
      act(() => result.current.onInputChange('   '))
      act(() => result.current.onKeyPress(','))
      expect(result.current.confirmedTags).toEqual([])
    })

    it('trims whitespace when confirming a tag', () => {
      const { result } = render()
      act(() => result.current.onInputChange('  react  '))
      act(() => result.current.onKeyPress(','))
      expect(result.current.confirmedTags).toEqual(['react'])
    })

    it('accumulates multiple confirmed tags', () => {
      const { result, onChange } = render()
      act(() => result.current.onInputChange('react'))
      act(() => result.current.onKeyPress(','))
      act(() => result.current.onInputChange('css'))
      act(() => result.current.onKeyPress(','))
      act(() => result.current.onInputChange('vue'))
      act(() => result.current.onKeyPress(','))
      expect(result.current.confirmedTags).toEqual(['react', 'css', 'vue'])
      expect(onChange).toHaveBeenLastCalledWith('react, css, vue')
    })
  })

  describe('onKeyPress — Backspace', () => {
    it('removes the last confirmed tag when currentInput is empty', () => {
      const { result, onChange } = render('react, css')
      act(() => result.current.onKeyPress('Backspace'))
      expect(result.current.confirmedTags).toEqual(['react'])
      expect(onChange).toHaveBeenLastCalledWith('react')
    })

    it('does nothing to confirmedTags when currentInput is not empty', () => {
      const { result } = render('react, css')
      act(() => result.current.onInputChange('vu'))
      act(() => result.current.onKeyPress('Backspace'))
      expect(result.current.confirmedTags).toEqual(['react', 'css'])
    })

    it('results in empty confirmedTags when the last tag is deleted', () => {
      const { result, onChange } = render('react')
      act(() => result.current.onKeyPress('Backspace'))
      expect(result.current.confirmedTags).toEqual([])
      expect(onChange).toHaveBeenLastCalledWith('')
    })
  })

  describe('onPaste', () => {
    it('splits pasted text by comma into multiple confirmed tags', () => {
      const { result, onChange } = render()
      act(() => result.current.onPaste('react,css,vue'))
      expect(result.current.confirmedTags).toEqual(['react', 'css', 'vue'])
      expect(result.current.currentInput).toBe('')
      expect(onChange).toHaveBeenLastCalledWith('react, css, vue')
    })

    it('splits pasted text by space into multiple confirmed tags', () => {
      const { result } = render()
      act(() => result.current.onPaste('react css vue'))
      expect(result.current.confirmedTags).toEqual(['react', 'css', 'vue'])
    })

    it('appends a single pasted word to currentInput', () => {
      const { result, onChange } = render()
      act(() => result.current.onInputChange('rea'))
      act(() => result.current.onPaste('ct'))
      expect(result.current.currentInput).toBe('react')
      expect(onChange).toHaveBeenLastCalledWith('react')
    })

    it('strips # from pasted tags', () => {
      const { result } = render()
      act(() => result.current.onPaste('#react,#css'))
      expect(result.current.confirmedTags).toEqual(['react', 'css'])
    })

    it('appends pasted tags to existing confirmed tags', () => {
      const { result } = render('existing')
      act(() => result.current.onPaste('react,css'))
      expect(result.current.confirmedTags).toEqual(['existing', 'react', 'css'])
    })
  })

  describe('confirmCurrent', () => {
    it('confirms the current input and clears it', () => {
      const { result, onChange } = render()
      act(() => result.current.onInputChange('react'))
      act(() => result.current.confirmCurrent())
      expect(result.current.confirmedTags).toEqual(['react'])
      expect(result.current.currentInput).toBe('')
      expect(onChange).toHaveBeenLastCalledWith('react')
    })

    it('does nothing when currentInput is empty', () => {
      const { result, onChange } = render()
      act(() => result.current.confirmCurrent())
      expect(result.current.confirmedTags).toEqual([])
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('suggestions', () => {
    it('returns empty suggestions when no availableTags provided', () => {
      const { result } = render()
      act(() => result.current.onInputChange('rea'))
      expect(result.current.suggestions).toEqual([])
    })

    it('returns empty suggestions when currentInput is empty', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      expect(result.current.suggestions).toEqual([])
    })

    it('returns matching tags by substring (case-insensitive)', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('rea'))
      expect(result.current.suggestions).toContain('react')
    })

    it('excludes already-confirmed tags from suggestions', () => {
      const { result } = render('react', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('rea'))
      expect(result.current.suggestions).not.toContain('react')
    })

    it('limits suggestions to 8 results', () => {
      const many = Array.from({ length: 20 }, (_, i) => `tag-${i}`)
      const { result } = render('', vi.fn(), many)
      act(() => result.current.onInputChange('tag'))
      expect(result.current.suggestions.length).toBeLessThanOrEqual(8)
    })

    it('resets selectedIndex to -1 when input changes', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('rea'))
      act(() => result.current.onKeyPress('ArrowDown'))
      expect(result.current.selectedIndex).toBe(0)
      act(() => result.current.onInputChange('reac'))
      expect(result.current.selectedIndex).toBe(-1)
    })
  })

  describe('keyboard navigation', () => {
    it('ArrowDown increments selectedIndex', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('a'))
      act(() => result.current.onKeyPress('ArrowDown'))
      expect(result.current.selectedIndex).toBe(0)
      act(() => result.current.onKeyPress('ArrowDown'))
      expect(result.current.selectedIndex).toBe(1)
    })

    it('ArrowDown does not exceed last suggestion index', () => {
      const { result } = render('', vi.fn(), ['react'])
      act(() => result.current.onInputChange('rea'))
      act(() => result.current.onKeyPress('ArrowDown'))
      act(() => result.current.onKeyPress('ArrowDown'))
      expect(result.current.selectedIndex).toBe(0)
    })

    it('ArrowUp decrements selectedIndex', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('a'))
      act(() => result.current.onKeyPress('ArrowDown'))
      act(() => result.current.onKeyPress('ArrowDown'))
      act(() => result.current.onKeyPress('ArrowUp'))
      expect(result.current.selectedIndex).toBe(0)
    })

    it('ArrowUp does not go below -1', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('rea'))
      act(() => result.current.onKeyPress('ArrowUp'))
      expect(result.current.selectedIndex).toBe(-1)
    })

    it('Escape resets selectedIndex to -1', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('rea'))
      act(() => result.current.onKeyPress('ArrowDown'))
      act(() => result.current.onKeyPress('Escape'))
      expect(result.current.selectedIndex).toBe(-1)
    })

    it('Enter selects highlighted suggestion when selectedIndex >= 0', () => {
      const { result } = render('', vi.fn(), ['react', 'css'])
      act(() => result.current.onInputChange('rea'))
      act(() => result.current.onKeyPress('ArrowDown'))
      act(() => result.current.onKeyPress('Enter'))
      expect(result.current.confirmedTags).toContain('react')
      expect(result.current.currentInput).toBe('')
      expect(result.current.selectedIndex).toBe(-1)
    })

    it('Tab selects highlighted suggestion when selectedIndex >= 0', () => {
      const { result } = render('', vi.fn(), ['react', 'css'])
      act(() => result.current.onInputChange('rea'))
      act(() => result.current.onKeyPress('ArrowDown'))
      act(() => result.current.onKeyPress('Tab'))
      expect(result.current.confirmedTags).toContain('react')
      expect(result.current.currentInput).toBe('')
    })

    it('Enter confirms typed input when no suggestion is highlighted', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('mynewt'))
      act(() => result.current.onKeyPress('Enter'))
      expect(result.current.confirmedTags).toContain('mynewt')
    })
  })

  describe('onKeyPress return value (tells caller whether to preventDefault)', () => {
    function press(result: { current: { onKeyPress: (key: string) => boolean } }, key: string) {
      let handled: boolean | undefined
      act(() => { handled = result.current.onKeyPress(key) })
      return handled
    }

    it('returns false for navigation keys when there are no suggestions', () => {
      const { result } = render()
      expect(press(result, 'ArrowDown')).toBe(false)
      expect(press(result, 'ArrowUp')).toBe(false)
      expect(press(result, 'Escape')).toBe(false)
    })

    it('returns true for navigation keys when suggestions are open', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('rea'))
      expect(press(result, 'ArrowDown')).toBe(true)
      expect(press(result, 'Escape')).toBe(true)
    })

    it('returns true for comma, space, and Enter (always confirm)', () => {
      const { result } = render()
      act(() => result.current.onInputChange('css'))
      expect(press(result, ',')).toBe(true)
      act(() => result.current.onInputChange('css'))
      expect(press(result, ' ')).toBe(true)
      act(() => result.current.onInputChange('css'))
      expect(press(result, 'Enter')).toBe(true)
    })

    it('returns false for Tab when no suggestions are open, so focus can still move', () => {
      const { result } = render()
      act(() => result.current.onInputChange('css'))
      expect(press(result, 'Tab')).toBe(false)
      expect(result.current.confirmedTags).toContain('css')
    })

    it('returns true for Tab when suggestions are open', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('rea'))
      expect(press(result, 'Tab')).toBe(true)
    })

    it('returns false for Backspace when currentInput has text, so native deletion runs', () => {
      const { result } = render()
      act(() => result.current.onInputChange('css'))
      expect(press(result, 'Backspace')).toBe(false)
    })

    it('returns true for Backspace when currentInput is empty, to remove the last confirmed tag', () => {
      const { result } = render('css')
      expect(press(result, 'Backspace')).toBe(true)
      expect(result.current.confirmedTags).toEqual([])
    })

    it('returns false for unrelated keys', () => {
      const { result } = render()
      expect(press(result, 'a')).toBe(false)
    })
  })

  describe('selectSuggestion', () => {
    it('adds the tag to confirmedTags and clears input', () => {
      const onChange = vi.fn()
      const { result } = render('', onChange, AVAILABLE)
      act(() => result.current.onInputChange('rea'))
      act(() => result.current.selectSuggestion('react'))
      expect(result.current.confirmedTags).toEqual(['react'])
      expect(result.current.currentInput).toBe('')
      expect(onChange).toHaveBeenLastCalledWith('react')
    })

    it('does not duplicate a tag already in confirmedTags when called directly', () => {
      const { result } = render('css', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('rea'))
      act(() => result.current.selectSuggestion('react'))
      expect(result.current.confirmedTags).toEqual(['css', 'react'])
    })
  })

  describe('closeSuggestions', () => {
    it('resets selectedIndex to -1', () => {
      const { result } = render('', vi.fn(), AVAILABLE)
      act(() => result.current.onInputChange('rea'))
      act(() => result.current.onKeyPress('ArrowDown'))
      act(() => result.current.closeSuggestions())
      expect(result.current.selectedIndex).toBe(-1)
    })
  })

  describe('onChange serialization', () => {
    it('serializes confirmed tags and pending input together', () => {
      const { result, onChange } = render()
      act(() => result.current.onInputChange('react'))
      act(() => result.current.onKeyPress(','))
      act(() => result.current.onInputChange('css'))
      expect(onChange).toHaveBeenLastCalledWith('react, css')
    })

    it('omits trailing separator when currentInput is empty', () => {
      const { result, onChange } = render()
      act(() => { result.current.onInputChange('react'); result.current.onKeyPress(',') })
      expect(onChange).toHaveBeenLastCalledWith('react')
    })
  })
})
