// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import LinkListHeader from '@/app/dashboard/link/LinkListHeader'

const mockUseLinkListContext = vi.fn()
vi.mock('@/app/dashboard/link/LinkListContext', () => ({
  useLinkListContext: () => mockUseLinkListContext(),
}))

const handleRefresh = vi.fn()

function setContext(overrides: Record<string, unknown> = {}) {
  mockUseLinkListContext.mockReturnValue({
    totalCount: 3,
    setModalOpen: vi.fn(),
    isSelectionMode: false,
    selectedCount: 0,
    enterSelectionMode: vi.fn(),
    exitSelectionMode: vi.fn(),
    favoritesOnly: false,
    refreshing: false,
    handleRefresh,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setContext()
})

afterEach(() => cleanup())

describe('LinkListHeader refresh button', () => {
  it('renders with aria-label "Refresh links" and calls handleRefresh on click', () => {
    render(<LinkListHeader />)
    const button = screen.getByRole('button', { name: 'Refresh links' })

    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(button.getAttribute('aria-busy')).toBe('false')

    fireEvent.click(button)
    expect(handleRefresh).toHaveBeenCalledOnce()
  })

  it('sits left of the Select button', () => {
    render(<LinkListHeader />)
    const buttons = screen.getAllByRole('button').map(b => b.getAttribute('aria-label') ?? b.textContent)
    expect(buttons.indexOf('Refresh links')).toBe(buttons.indexOf('Select links') - 1)
  })

  it('is disabled with aria-busy="true" and a spinning icon while refreshing', () => {
    setContext({ refreshing: true })
    render(<LinkListHeader />)
    const button = screen.getByRole('button', { name: 'Refresh links' })

    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.querySelector('svg')?.getAttribute('class')).toContain('animate-spin')

    fireEvent.click(button)
    expect(handleRefresh).not.toHaveBeenCalled()
  })

  it('is absent in selection mode', () => {
    setContext({ isSelectionMode: true, selectedCount: 2 })
    render(<LinkListHeader />)

    expect(screen.getByText('2 selected')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Refresh links' })).toBeNull()
  })
})
