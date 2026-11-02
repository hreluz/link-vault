// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import BulkTagModal from '@/app/dashboard/link/BulkTagModal'

vi.mock('@/lib/hooks/tags/useAvailableTags', () => ({
  useAvailableTags: () => ['react', 'reading'],
}))

vi.mock('@/app/dashboard/link/LinkListContext', () => ({
  useLinkListContext: () => ({ handleBulkTagSelected: vi.fn() }),
}))

afterEach(() => {
  cleanup()
})

describe('BulkTagModal', () => {
  it('adds the chip and blurs the input when Space completes to a suggestion', () => {
    render(<BulkTagModal onClose={vi.fn()} />)
    const input = screen.getByPlaceholderText('Type tags, separated by commas…')
    expect(document.activeElement).toBe(input)

    fireEvent.change(input, { target: { value: 'rea' } })
    fireEvent.keyDown(input, { key: ' ' })

    expect(screen.getByLabelText('Remove tag react')).toBeTruthy()
    expect(document.activeElement).not.toBe(input)
  })
})
