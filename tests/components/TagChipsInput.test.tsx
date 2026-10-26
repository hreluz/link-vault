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

  it('disables the input and remove buttons when disabled', () => {
    render(<TagChipsInput label="Tags" value="react" onChange={vi.fn()} disabled describedBy="hint" />)

    const input = screen.getByLabelText('Tags') as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect(input.getAttribute('aria-describedby')).toBe('hint')
    expect((screen.getByLabelText('Remove tag react') as HTMLButtonElement).disabled).toBe(true)
  })
})
