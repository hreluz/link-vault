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
const handleUndoMove = vi.fn()

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
    lastMovedLink: null,
    undoingMove: false,
    handleUndoMove,
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

describe('LinkListHeader undo button', () => {
  const moved = { id: '1', title: 'Alpha Article', url: 'https://alpha.com' }

  it('is hidden when there is no move to undo', () => {
    render(<LinkListHeader />)
    expect(screen.queryByRole('button', { name: 'Undo last move' })).toBeNull()
  })

  it('shows "Undo" with the moved link\'s title, left of the refresh button', () => {
    setContext({ lastMovedLink: moved })
    render(<LinkListHeader />)
    const button = screen.getByRole('button', { name: 'Undo last move' })

    expect(button.textContent).toBe('Undo')
    expect(button.getAttribute('title')).toBe('Move Alpha Article back')
    const buttons = screen.getAllByRole('button').map(b => b.getAttribute('aria-label') ?? b.textContent)
    expect(buttons.indexOf('Undo last move')).toBe(buttons.indexOf('Refresh links') - 1)
  })

  it('falls back to the URL in the title when the link has no title', () => {
    setContext({ lastMovedLink: { ...moved, title: null } })
    render(<LinkListHeader />)
    expect(screen.getByRole('button', { name: 'Undo last move' }).getAttribute('title')).toBe('Move https://alpha.com back')
  })

  it('calls handleUndoMove on click', () => {
    setContext({ lastMovedLink: moved })
    render(<LinkListHeader />)

    fireEvent.click(screen.getByRole('button', { name: 'Undo last move' }))

    expect(handleUndoMove).toHaveBeenCalledOnce()
  })

  it('is disabled while the undo is saving', () => {
    setContext({ lastMovedLink: moved, undoingMove: true })
    render(<LinkListHeader />)
    const button = screen.getByRole('button', { name: 'Undo last move' })

    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    expect(handleUndoMove).not.toHaveBeenCalled()
  })

  it('is absent in selection mode', () => {
    setContext({ lastMovedLink: moved, isSelectionMode: true, selectedCount: 1 })
    render(<LinkListHeader />)
    expect(screen.queryByRole('button', { name: 'Undo last move' })).toBeNull()
  })
})
