// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import SearchBar from '@/components/SearchBar'

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  cleanup()
})

describe('SearchBar', () => {
  it('keeps the dashboard label and the full placeholder from sm up by default', () => {
    mockMatchMedia(true)
    render(<SearchBar value="" onChange={vi.fn()} />)

    const input = screen.getByLabelText('Search links')
    expect(input.getAttribute('placeholder')).toBe('Search by title, domain, tag… or #tag for tag-only')
  })

  it('keeps the short placeholder below sm by default', () => {
    mockMatchMedia(false)
    render(<SearchBar value="" onChange={vi.fn()} />)

    expect(screen.getByLabelText('Search links').getAttribute('placeholder')).toBe('Search or #tag')
  })

  it('renders a custom label and placeholder', () => {
    mockMatchMedia(true)
    render(<SearchBar value="" onChange={vi.fn()} label="Search collections" placeholder="Search collections" />)

    const input = screen.getByLabelText('Search collections')
    expect(input.getAttribute('placeholder')).toBe('Search collections')
    expect(screen.queryByLabelText('Search links')).toBeNull()
  })
})
