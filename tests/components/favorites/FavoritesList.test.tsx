// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import FavoritesList from '@/app/dashboard/favorites/FavoritesList'
import type { LinkWithTags } from '@/lib/services/links'

// ── fixtures ──────────────────────────────────────────────────────────────────

const BASE: Omit<LinkWithTags, 'id' | 'title'> = {
  url: 'https://example.com', site_name: 'example.com',
  status: 'unread', is_favorite: true, tags: [],
  description: null, notes: null, image_url: null,
  user_id: 'user-1', category_id: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
const LINK_A: LinkWithTags = { ...BASE, id: '1', title: 'Alpha' }
const LINK_B: LinkWithTags = { ...BASE, id: '2', title: 'Beta' }

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockHandleStatusChange = vi.fn()
const mockHandleEdit = vi.fn()
const mockHandleDelete = vi.fn()
const mockHandleFavoriteToggle = vi.fn()

const mockUseFavorites = vi.fn()

vi.mock('@/lib/hooks/links', () => ({
  useFavorites: () => mockUseFavorites(),
}))

vi.mock('@/app/dashboard/link/LinkCard', () => ({
  default: ({ link, onMenuOpen, onFavoriteToggle }: {
    link: LinkWithTags
    onMenuOpen: () => void
    onFavoriteToggle: () => void
  }) => (
    <div data-testid={`card-${link.id}`}>
      <button data-testid={`open-menu-${link.id}`} onClick={onMenuOpen}>open-menu</button>
      <button data-testid={`toggle-fav-${link.id}`} onClick={onFavoriteToggle}>toggle-fav</button>
    </div>
  ),
}))

vi.mock('@/app/dashboard/link/BottomSheet', () => ({
  default: ({ link, onStatusChange, onFavoriteToggle, onEdit, onDelete, onClose }: {
    link: LinkWithTags | null
    onStatusChange: (id: string, status: string) => void
    onFavoriteToggle: () => void
    onEdit: () => void
    onDelete: () => void
    onClose: () => void
  }) => link ? (
    <div data-testid="bottom-sheet">
      <span data-testid="sheet-link-id">{link.id}</span>
      <button data-testid="sheet-status" onClick={() => onStatusChange(link.id, 'read')}>change-status</button>
      <button data-testid="sheet-fav" onClick={onFavoriteToggle}>toggle-fav</button>
      <button data-testid="sheet-edit" onClick={onEdit}>edit</button>
      <button data-testid="sheet-delete" onClick={onDelete}>delete</button>
      <button data-testid="sheet-close" onClick={onClose}>close</button>
    </div>
  ) : null,
}))

vi.mock('@/app/dashboard/link/EditLinkModal', () => ({
  default: ({ link, onSave, onClose }: {
    link: LinkWithTags | null
    onSave: (updated: LinkWithTags) => void
    onClose: () => void
  }) => link ? (
    <div data-testid="edit-modal">
      <span data-testid="modal-link-id">{link.id}</span>
      <button data-testid="modal-save" onClick={() => onSave({ ...link, title: 'Saved' })}>save</button>
      <button data-testid="modal-close" onClick={onClose}>close</button>
    </div>
  ) : null,
}))

// ── helpers ───────────────────────────────────────────────────────────────────

function setup(overrides: object = {}) {
  mockUseFavorites.mockReturnValue({
    links: [LINK_A, LINK_B],
    loading: false,
    handleStatusChange: mockHandleStatusChange,
    handleEdit: mockHandleEdit,
    handleDelete: mockHandleDelete,
    handleFavoriteToggle: mockHandleFavoriteToggle,
    ...overrides,
  })
  return render(<FavoritesList />)
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => cleanup())

// ── tests ─────────────────────────────────────────────────────────────────────

describe('FavoritesList', () => {
  describe('loading state', () => {
    it('shows the heading and a spinner', () => {
      setup({ loading: true, links: [] })

      expect(screen.getByRole('heading', { name: 'Favorites' })).not.toBeNull()
      expect(document.querySelector('.animate-spin')).not.toBeNull()
    })

    it('does not render link cards while loading', () => {
      setup({ loading: true, links: [] })

      expect(screen.queryByTestId('card-1')).toBeNull()
    })
  })

  describe('empty state', () => {
    it('shows the empty message', () => {
      setup({ links: [] })

      expect(screen.getByText('No favorites yet. Star a link to see it here.')).not.toBeNull()
    })

    it('shows 0 links count', () => {
      setup({ links: [] })

      expect(screen.getByText('0 links')).not.toBeNull()
    })
  })

  describe('with links', () => {
    it('renders a card for each link', () => {
      setup()

      expect(screen.getByTestId('card-1')).not.toBeNull()
      expect(screen.getByTestId('card-2')).not.toBeNull()
    })

    it('shows the correct link count', () => {
      setup()

      expect(screen.getByText('2 links')).not.toBeNull()
    })

    it('uses singular "link" for a single result', () => {
      setup({ links: [LINK_A] })

      expect(screen.getByText('1 link')).not.toBeNull()
    })
  })

  describe('BottomSheet', () => {
    it('is not rendered initially', () => {
      setup()

      expect(screen.queryByTestId('bottom-sheet')).toBeNull()
    })

    it('opens with the correct link when onMenuOpen is called', () => {
      setup()

      fireEvent.click(screen.getByTestId('open-menu-1'))

      expect(screen.queryByTestId('bottom-sheet')).not.toBeNull()
      expect(screen.getByTestId('sheet-link-id').textContent).toBe('1')
    })

    it('closes when onClose is called', () => {
      setup()
      fireEvent.click(screen.getByTestId('open-menu-1'))

      fireEvent.click(screen.getByTestId('sheet-close'))

      expect(screen.queryByTestId('bottom-sheet')).toBeNull()
    })

    it('calls handleStatusChange and closes the sheet', () => {
      setup()
      fireEvent.click(screen.getByTestId('open-menu-1'))

      fireEvent.click(screen.getByTestId('sheet-status'))

      expect(mockHandleStatusChange).toHaveBeenCalledWith('1', 'read')
      expect(screen.queryByTestId('bottom-sheet')).toBeNull()
    })

    it('calls handleFavoriteToggle for the active link', () => {
      setup()
      fireEvent.click(screen.getByTestId('open-menu-1'))

      fireEvent.click(screen.getByTestId('sheet-fav'))

      expect(mockHandleFavoriteToggle).toHaveBeenCalledWith('1')
    })

    it('calls handleDelete with the active link id and closes the sheet', () => {
      setup()
      fireEvent.click(screen.getByTestId('open-menu-1'))

      fireEvent.click(screen.getByTestId('sheet-delete'))

      expect(mockHandleDelete).toHaveBeenCalledWith('1')
      expect(screen.queryByTestId('bottom-sheet')).toBeNull()
    })
  })

  describe('EditLinkModal', () => {
    it('is not rendered initially', () => {
      setup()

      expect(screen.queryByTestId('edit-modal')).toBeNull()
    })

    it('opens with the active link when sheet onEdit is called', () => {
      setup()
      fireEvent.click(screen.getByTestId('open-menu-1'))

      fireEvent.click(screen.getByTestId('sheet-edit'))

      expect(screen.queryByTestId('edit-modal')).not.toBeNull()
      expect(screen.getByTestId('modal-link-id').textContent).toBe('1')
    })

    it('calls handleEdit and closes the modal on save', () => {
      setup()
      fireEvent.click(screen.getByTestId('open-menu-1'))
      fireEvent.click(screen.getByTestId('sheet-edit'))

      fireEvent.click(screen.getByTestId('modal-save'))

      expect(mockHandleEdit).toHaveBeenCalledWith(expect.objectContaining({ id: '1', title: 'Saved' }))
      expect(screen.queryByTestId('edit-modal')).toBeNull()
    })

    it('closes without saving on modal close', () => {
      setup()
      fireEvent.click(screen.getByTestId('open-menu-1'))
      fireEvent.click(screen.getByTestId('sheet-edit'))

      fireEvent.click(screen.getByTestId('modal-close'))

      expect(mockHandleEdit).not.toHaveBeenCalled()
      expect(screen.queryByTestId('edit-modal')).toBeNull()
    })
  })

  describe('LinkCard onFavoriteToggle', () => {
    it('calls handleFavoriteToggle with the correct link id', () => {
      setup()

      fireEvent.click(screen.getByTestId('toggle-fav-2'))

      expect(mockHandleFavoriteToggle).toHaveBeenCalledWith('2')
    })
  })
})
