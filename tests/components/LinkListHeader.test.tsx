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
    unreadCount: 2,
    selectedStatuses: [],
    setModalOpen: vi.fn(),
    favoritesOnly: false,
    refreshing: false,
    handleRefresh,
    lastMovedLink: null,
    undoingMove: false,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setContext()
})

afterEach(() => cleanup())

describe('LinkListHeader count', () => {
  it('shows the link count with the unread count in parentheses', () => {
    setContext({ totalCount: 3012, unreadCount: 1200 })
    render(<LinkListHeader />)
    expect(screen.getByText('3012 links (1200 unread)')).toBeTruthy()
  })

  it('uses the singular for one link', () => {
    setContext({ totalCount: 1, unreadCount: 0 })
    render(<LinkListHeader />)
    expect(screen.getByText('1 link (0 unread)')).toBeTruthy()
  })

  it('hides the unread count when filtering by Unread', () => {
    setContext({ totalCount: 26, unreadCount: 26, selectedStatuses: ['unread'] })
    render(<LinkListHeader />)
    expect(screen.getByText('26 links')).toBeTruthy()
    expect(screen.queryByText(/unread/)).toBeNull()
  })

  it('hides the unread count for any other status filter too', () => {
    setContext({ totalCount: 40, unreadCount: 26, selectedStatuses: ['unread', 'read'] })
    render(<LinkListHeader />)
    expect(screen.getByText('40 links')).toBeTruthy()
    expect(screen.queryByText(/unread/)).toBeNull()
  })
})

describe('LinkListHeader refresh button', () => {
  it('renders with aria-label "Refresh links" and calls handleRefresh on click', () => {
    render(<LinkListHeader />)
    const button = screen.getByRole('button', { name: 'Refresh links' })

    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(button.getAttribute('aria-busy')).toBe('false')

    fireEvent.click(button)
    expect(handleRefresh).toHaveBeenCalledOnce()
  })

  it('sits directly left of the Add link button', () => {
    render(<LinkListHeader />)
    const buttons = screen.getAllByRole('button').map(b => b.getAttribute('aria-label') ?? b.textContent)
    expect(buttons.indexOf('Refresh links')).toBe(buttons.indexOf('Add link') - 1)
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
})

describe('LinkListHeader undo button', () => {
  // Undo lives in the top bar now (HeaderUndoButton, SPEC 36).
  it('renders no Undo, with or without a move to undo', () => {
    render(<LinkListHeader />)
    expect(screen.queryByRole('button', { name: 'Undo last move' })).toBeNull()
    cleanup()

    setContext({ lastMovedLink: { id: '1', title: 'Alpha Article', url: 'https://alpha.com' } })
    render(<LinkListHeader />)
    expect(screen.queryByRole('button', { name: 'Undo last move' })).toBeNull()
  })
})

describe('LinkListHeader Add button', () => {
  it('renders no Select links button', () => {
    render(<LinkListHeader />)
    expect(screen.queryByRole('button', { name: 'Select links' })).toBeNull()
  })

  it('shows only + while keeping the Add link name and tooltip', () => {
    render(<LinkListHeader />)
    const button = screen.getByRole('button', { name: 'Add link' })
    expect(button.textContent).toBe('+')
    expect(button.getAttribute('title')).toBe('Add link')
  })

  it('opens the modal on click', () => {
    const setModalOpen = vi.fn()
    setContext({ setModalOpen })
    render(<LinkListHeader />)
    fireEvent.click(screen.getByRole('button', { name: 'Add link' }))
    expect(setModalOpen).toHaveBeenCalledWith(true)
  })
})
