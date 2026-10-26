// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import LinkCard from '@/app/dashboard/link/LinkCard'
import type { LinkWithTags } from '@/lib/services/links'

vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: vi.fn() }),
}))

afterEach(cleanup)

const LINK: LinkWithTags = {
  id: '1', user_id: 'user-1', url: 'https://alpha.com', title: 'Alpha Article',
  description: null, site_name: 'alpha.com', image_url: null, duration: null, notes: null,
  category_id: null, status: 'read', is_favorite: false, tags: [],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, moved_to_end_at: null,
}

function renderCard(props: Partial<React.ComponentProps<typeof LinkCard>> = {}) {
  return render(
    <LinkCard link={LINK} onMenuOpen={vi.fn()} onFavoriteToggle={vi.fn()} {...props} />
  )
}

describe('LinkCard last-opened marker', () => {
  it('shows no marker by default', () => {
    renderCard()

    expect(screen.queryByText('Last opened')).toBeNull()
    expect(screen.getByRole('link', { name: 'Alpha Article' }).getAttribute('aria-current')).toBeNull()
  })

  it('shows the pill and aria-current when it is the last-opened link', () => {
    renderCard({ isLastOpened: true })

    expect(screen.getByText('Last opened')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Alpha Article' }).getAttribute('aria-current')).toBe('true')
  })

  it('pulses only while pulse is set', () => {
    const { container, rerender } = renderCard({ isLastOpened: true, pulse: true })
    expect(screen.getByTestId('last-opened-pulse')).toBeTruthy()
    // Fading the card itself would reveal the swipe-delete backdrop beneath it.
    expect(container.querySelector('article')?.className).not.toContain('animate-pulse')

    rerender(<LinkCard link={LINK} onMenuOpen={vi.fn()} onFavoriteToggle={vi.fn()} isLastOpened />)
    expect(screen.queryByTestId('last-opened-pulse')).toBeNull()
  })

  it('hides the marker in selection mode', () => {
    renderCard({ isLastOpened: true, pulse: true, isSelectionMode: true })

    expect(screen.queryByText('Last opened')).toBeNull()
  })
})

describe('LinkCard edit shortcut', () => {
  it('calls onEdit from the card without opening the menu', () => {
    const onEdit = vi.fn()
    const onMenuOpen = vi.fn()
    renderCard({ onEdit, onMenuOpen })

    fireEvent.click(screen.getByRole('button', { name: 'Edit link' }))

    expect(onEdit).toHaveBeenCalledOnce()
    expect(onMenuOpen).not.toHaveBeenCalled()
  })

  it('hides the edit button when no handler is given or in selection mode', () => {
    renderCard()
    expect(screen.queryByRole('button', { name: 'Edit link' })).toBeNull()
    cleanup()

    renderCard({ onEdit: vi.fn(), isSelectionMode: true })
    expect(screen.queryByRole('button', { name: 'Edit link' })).toBeNull()
  })
})

describe('LinkCard delete button', () => {
  it('is the first button in the row, before the favorite star', () => {
    renderCard({ onDelete: vi.fn(), onEdit: vi.fn() })

    const names = screen.getAllByRole('button').map(b => b.getAttribute('aria-label'))
    expect(names).toEqual(['Delete link', 'Add to favorites', 'Edit link', 'Link options'])
  })

  it('calls onDelete once on a non-favorite link', () => {
    const onDelete = vi.fn()
    renderCard({ onDelete })

    const button = screen.getByRole('button', { name: 'Delete link' })
    expect(button).toHaveProperty('disabled', false)
    expect(button.getAttribute('title')).toBe('Delete')
    fireEvent.click(button)

    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('is disabled on a favorite link and does not call onDelete', () => {
    const onDelete = vi.fn()
    renderCard({ link: { ...LINK, is_favorite: true }, onDelete })

    const button = screen.getByRole('button', { name: 'Delete link' })
    expect(button).toHaveProperty('disabled', true)
    expect(button.getAttribute('title')).toBe('Unfavorite to delete')
    fireEvent.click(button)

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('is not rendered in selection mode or without onDelete', () => {
    renderCard({ onDelete: vi.fn(), isSelectionMode: true })
    expect(screen.queryByRole('button', { name: 'Delete link' })).toBeNull()
    cleanup()

    renderCard()
    expect(screen.queryByRole('button', { name: 'Delete link' })).toBeNull()
  })
})
