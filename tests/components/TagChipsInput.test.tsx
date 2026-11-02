// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import TagChipsInput from '@/components/TagChipsInput'

vi.mock('@/lib/hooks/tags/useAvailableTags', () => ({
  useAvailableTags: () => ['react', 'reading'],
}))

afterEach(() => {
  cleanup()
})

describe('TagChipsInput', () => {
  it('adds a chip on comma and reports the comma-separated value', () => {
    const onChange = vi.fn()
    render(<TagChipsInput label="Tags" value="" onChange={onChange} />)
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'react' } })
    fireEvent.keyDown(input, { key: ',' })

    expect(screen.getByText('#react')).toBeTruthy()
    expect(onChange).toHaveBeenLastCalledWith('react')
  })

  it('removes a chip with its remove button', () => {
    const onChange = vi.fn()
    render(<TagChipsInput label="Tags" value="react, video" onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Remove tag react'))

    expect(screen.queryByText('#react')).toBeNull()
    expect(screen.getByText('#video')).toBeTruthy()
    expect(onChange).toHaveBeenLastCalledWith('video')
  })

  it('suggests available tags and selects one with Enter', () => {
    const onChange = vi.fn()
    render(<TagChipsInput label="Tags" value="" onChange={onChange} />)
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'rea' } })
    expect(screen.getByText('#reading')).toBeTruthy()

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenLastCalledWith('react')
    expect(screen.getByText('#react')).toBeTruthy()
  })

  it('adds the first suggestion with Tab when none is highlighted', () => {
    const onChange = vi.fn()
    render(<TagChipsInput label="Tags" value="" onChange={onChange} />)
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'rea' } })
    fireEvent.keyDown(input, { key: 'Tab' })

    expect(onChange).toHaveBeenLastCalledWith('react')
    expect(screen.getByText('#react')).toBeTruthy()
    expect(screen.queryByText('#rea')).toBeNull()
  })

  it('adds the first suggestion with Space when none is highlighted', () => {
    const onChange = vi.fn()
    render(<TagChipsInput label="Tags" value="" onChange={onChange} />)
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'rea' } })
    fireEvent.keyDown(input, { key: ' ' })

    expect(onChange).toHaveBeenLastCalledWith('react')
    expect(screen.getByText('#react')).toBeTruthy()
    expect(screen.queryByText('#rea')).toBeNull()
  })

  it('adds the first suggestion when a mobile keyboard types the space into the value', () => {
    const onChange = vi.fn()
    render(<TagChipsInput label="Tags" value="" onChange={onChange} />)
    const input = screen.getByLabelText('Tags') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'rea' } })
    fireEvent.change(input, { target: { value: 'rea ' } })

    expect(onChange).toHaveBeenLastCalledWith('react')
    expect(screen.getByText('#react')).toBeTruthy()
    expect(input.value).toBe('')
  })

  describe('blur on add', () => {
    function renderFocused() {
      render(<TagChipsInput label="Tags" value="" onChange={vi.fn()} />)
      const input = screen.getByLabelText('Tags')
      input.focus()
      expect(document.activeElement).toBe(input)
      return input
    }

    it('blurs after Space completes to a suggestion', () => {
      const input = renderFocused()

      fireEvent.change(input, { target: { value: 'rea' } })
      fireEvent.keyDown(input, { key: ' ' })

      expect(screen.getByText('#react')).toBeTruthy()
      expect(document.activeElement).not.toBe(input)
    })

    it('blurs after mouse-down on a suggestion row', () => {
      const input = renderFocused()

      fireEvent.change(input, { target: { value: 'rea' } })
      fireEvent.mouseDown(screen.getByText('#react'))

      expect(screen.getByText('#react')).toBeTruthy()
      expect(document.activeElement).not.toBe(input)
    })

    it('blurs after Enter adds the typed text', () => {
      const input = renderFocused()

      fireEvent.change(input, { target: { value: 'zzz' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(screen.getByText('#zzz')).toBeTruthy()
      expect(document.activeElement).not.toBe(input)
    })

    it('stays focused when Space is pressed on an empty input', () => {
      const input = renderFocused()

      fireEvent.keyDown(input, { key: ' ' })

      expect(document.activeElement).toBe(input)
    })

    it('stays focused after pasting several tags', () => {
      const input = renderFocused()

      fireEvent.paste(input, { clipboardData: { getData: () => 'a, b' } })

      expect(screen.getByText('#a')).toBeTruthy()
      expect(screen.getByText('#b')).toBeTruthy()
      expect(document.activeElement).toBe(input)
    })
  })

  it('disables the input and remove buttons when disabled', () => {
    render(<TagChipsInput label="Tags" value="react" onChange={vi.fn()} disabled describedBy="hint" />)

    const input = screen.getByLabelText('Tags') as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect(input.getAttribute('aria-describedby')).toBe('hint')
    expect((screen.getByLabelText('Remove tag react') as HTMLButtonElement).disabled).toBe(true)
  })
})
