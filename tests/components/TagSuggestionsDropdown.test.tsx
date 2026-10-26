// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import TagSuggestionsDropdown from '@/components/TagSuggestionsDropdown'

const HINT = 'bg-surface-50'
const SELECTED = 'bg-primary-50'

afterEach(() => {
  cleanup()
})

function row(tag: string) {
  return screen.getByText(`#${tag}`)
}

describe('TagSuggestionsDropdown', () => {
  it('styles the hint row as the Tab target when nothing is highlighted', () => {
    render(<TagSuggestionsDropdown suggestions={['react', 'reading']} selectedIndex={-1} hintIndex={0} onSelect={vi.fn()} />)

    expect(row('react').classList).toContain(HINT)
    expect(row('reading').classList).not.toContain(HINT)
  })

  it('shows only the selected style once a row is highlighted', () => {
    render(<TagSuggestionsDropdown suggestions={['react', 'reading']} selectedIndex={1} onSelect={vi.fn()} />)

    expect(row('reading').classList).toContain(SELECTED)
    expect(row('react').classList).not.toContain(HINT)
    expect(row('reading').classList).not.toContain(HINT)
  })

  it('styles no row as a hint when hintIndex is omitted', () => {
    render(<TagSuggestionsDropdown suggestions={['react', 'reading']} selectedIndex={-1} onSelect={vi.fn()} />)

    expect(row('react').classList).not.toContain(HINT)
    expect(row('reading').classList).not.toContain(HINT)
  })
})
