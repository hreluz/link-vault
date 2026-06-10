// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import FavoritesList from '@/app/dashboard/favorites/FavoritesList'
import type { LinkWithTags } from '@/lib/services/links'

// ── fixtures ──────────────────────────────────────────────────────────────────

const BASE: Omit<LinkWithTags, 'id' | 'title'> = {
  url: 'https://example.com', site_name: 'example.com',
  status: 'unread', is_favorite: true, tags: [],
  description: null, notes: null,
  user_id: 'user-1', category_id: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}
const LINK_A: LinkWithTags = { ...BASE, id: '1', title: 'Alpha', status: 'unread' }
const LINK_B: LinkWithTags = { ...BASE, id: '2', title: 'Beta', status: 'unread' }
const LINK_READ: LinkWithTags = { ...BASE, id: '3', title: 'Read Link', status: 'read' }

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockHandleStatusChange = vi.fn()
const mockHandleEdit = vi.fn()
const mockHandleDelete = vi.fn()
const mockHandleFavoriteToggle = vi.fn()

const mockUseFavorites = vi.fn()

// Mock useFavorites at its direct path so useFavoritesList + useLinkFilters run for real
vi.mock('@/lib/hooks/links/useFavorites', () => ({
  useFavorites: () => mockUseFavorites(),
}))

vi.mock('@/lib/hooks/categories/useCategoryList', () => ({
  useCategoryList: () => ({ categories: [], loading: false }),
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

vi.mock('@/components/SearchBar', () => ({
  default: ({ value, onChange, onFilterOpen }: {
    value: string
    onChange: (q: string) => void
    onFilterOpen?: () => void
  }) => (
    <>
      <input
        data-testid="search-bar"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {onFilterOpen && <button data-testid="open-filters" onClick={onFilterOpen}>Filters</button>}
    </>
  ),
}))

vi.mock('@/app/dashboard/link/StatusTabBar', () => ({
  StatusTabBar: ({ value, onChange }: { value: string | null; onChange: (s: string | null) => void }) => (
    <div data-testid="status-tab-bar">
      <button data-testid="tab-all" onClick={() => onChange(null)}>All</button>
      <button data-testid="tab-unread" onClick={() => onChange('unread')}>Unread</button>
      <button data-testid="tab-read" onClick={() => onChange('read')}>Read</button>
    </div>
  ),
}))

vi.mock('@/app/dashboard/link/FilterSheet', () => ({
  default: ({ isOpen, onReset, onClose }: {
    isOpen: boolean
    onReset: () => void
    onClose: () => void
  }) => isOpen ? (
    <div data-testid="filter-sheet">
      <button data-testid="filter-reset" onClick={onReset}>reset</button>
      <button data-testid="filter-close" onClick={onClose}>close</button>
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

  describe('StatusTabBar filter', () => {
    it('renders the status tab bar', () => {
      setup()

      expect(screen.getByTestId('status-tab-bar')).not.toBeNull()
    })

    it('shows all links when no status is selected', () => {
      setup({ links: [LINK_A, LINK_READ] })

      expect(screen.getByTestId('card-1')).not.toBeNull()
      expect(screen.getByTestId('card-3')).not.toBeNull()
    })

    it('filters to matching links when a status is selected', () => {
      setup({ links: [LINK_A, LINK_READ] })

      fireEvent.click(screen.getByTestId('tab-read'))

      expect(screen.queryByTestId('card-1')).toBeNull()
      expect(screen.getByTestId('card-3')).not.toBeNull()
    })

    it('shows all links again when All is selected', () => {
      setup({ links: [LINK_A, LINK_READ] })
      fireEvent.click(screen.getByTestId('tab-read'))

      fireEvent.click(screen.getByTestId('tab-all'))

      expect(screen.getByTestId('card-1')).not.toBeNull()
      expect(screen.getByTestId('card-3')).not.toBeNull()
    })

    it('shows the active-filter empty message when no links match the status', () => {
      setup({ links: [LINK_A] })

      fireEvent.click(screen.getByTestId('tab-read'))

      expect(screen.getByText('No favorites match your search.')).not.toBeNull()
    })

    it('shows the default empty message when no status is selected and there are no links', () => {
      setup({ links: [] })

      expect(screen.getByText('No favorites yet. Star a link to see it here.')).not.toBeNull()
    })
  })

  describe('search bar', () => {
    it('renders the search bar', () => {
      setup()

      expect(screen.getByTestId('search-bar')).not.toBeNull()
    })

    it('filters links by title', () => {
      setup({ links: [LINK_A, LINK_B] })

      fireEvent.change(screen.getByTestId('search-bar'), { target: { value: 'Alpha' } })

      expect(screen.getByTestId('card-1')).not.toBeNull()
      expect(screen.queryByTestId('card-2')).toBeNull()
    })

    it('filters links by site_name', () => {
      const LINK_SITE: LinkWithTags = { ...BASE, id: '4', title: 'Site Link', status: 'unread', site_name: 'youtube.com' }
      setup({ links: [LINK_A, LINK_SITE] })

      fireEvent.change(screen.getByTestId('search-bar'), { target: { value: 'youtube' } })

      expect(screen.queryByTestId('card-1')).toBeNull()
      expect(screen.getByTestId('card-4')).not.toBeNull()
    })

    it('filters links by tag', () => {
      const LINK_TAGGED: LinkWithTags = { ...BASE, id: '5', title: 'Tagged', status: 'unread', tags: ['typescript'] }
      setup({ links: [LINK_A, LINK_TAGGED] })

      fireEvent.change(screen.getByTestId('search-bar'), { target: { value: 'typescript' } })

      expect(screen.queryByTestId('card-1')).toBeNull()
      expect(screen.getByTestId('card-5')).not.toBeNull()
    })

    it('shows the active-filter empty message when no links match the query', () => {
      setup({ links: [LINK_A] })

      fireEvent.change(screen.getByTestId('search-bar'), { target: { value: 'zzznomatch' } })

      expect(screen.getByText('No favorites match your search.')).not.toBeNull()
    })

    it('stacks with the status filter', () => {
      setup({ links: [LINK_A, LINK_READ] })

      fireEvent.change(screen.getByTestId('search-bar'), { target: { value: 'Alpha' } })
      fireEvent.click(screen.getByTestId('tab-unread'))

      expect(screen.getByTestId('card-1')).not.toBeNull()
      expect(screen.queryByTestId('card-3')).toBeNull()
    })

    it('shows a clear filters button when filters are active', () => {
      setup({ links: [LINK_A] })

      fireEvent.change(screen.getByTestId('search-bar'), { target: { value: 'zzz' } })

      expect(screen.getByRole('button', { name: 'Clear filters' })).not.toBeNull()
    })

    it('clears all filters when clear filters is clicked', () => {
      setup({ links: [LINK_A, LINK_READ] })
      fireEvent.click(screen.getByTestId('tab-read'))
      fireEvent.change(screen.getByTestId('search-bar'), { target: { value: 'zzz' } })

      fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

      expect(screen.getByTestId('card-1')).not.toBeNull()
      expect(screen.getByTestId('card-3')).not.toBeNull()
    })
  })

  describe('FilterSheet', () => {
    it('is not rendered initially', () => {
      setup()

      expect(screen.queryByTestId('filter-sheet')).toBeNull()
    })

    it('opens when the Filters button is clicked', () => {
      setup()

      fireEvent.click(screen.getByTestId('open-filters'))

      expect(screen.getByTestId('filter-sheet')).not.toBeNull()
    })

    it('closes when onClose is called', () => {
      setup()
      fireEvent.click(screen.getByTestId('open-filters'))

      fireEvent.click(screen.getByTestId('filter-close'))

      expect(screen.queryByTestId('filter-sheet')).toBeNull()
    })

    it('resets all filters when onReset is called', () => {
      setup({ links: [LINK_A, LINK_READ] })
      fireEvent.click(screen.getByTestId('tab-read'))
      fireEvent.click(screen.getByTestId('open-filters'))

      fireEvent.click(screen.getByTestId('filter-reset'))

      expect(screen.getByTestId('card-1')).not.toBeNull()
      expect(screen.getByTestId('card-3')).not.toBeNull()
    })
  })
})
