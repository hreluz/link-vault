// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTagInput } from '@/lib/hooks/links/useTagInput'

function render(initialTags = '', onChange = vi.fn()) {
  return { ...renderHook(() => useTagInput(initialTags, onChange)), onChange }
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
