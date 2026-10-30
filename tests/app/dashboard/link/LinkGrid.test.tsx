// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import LinkGrid from '@/app/dashboard/link/LinkGrid'
import type { LinkWithTags } from '@/lib/services/links'

const mockUseLinkListContext = vi.fn()
vi.mock('@/app/dashboard/link/LinkListContext', () => ({
  useLinkListContext: () => mockUseLinkListContext(),
}))

vi.mock('@/lib/hooks/categories/useCategoryList', () => ({
  useCategoryList: () => ({ categories: [] }),
}))

vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: vi.fn() }),
}))

const mockLoadMore = vi.fn()
const observers: IntersectionObserverCallback[] = []

function setContext(overrides: Record<string, unknown> = {}) {
  mockUseLinkListContext.mockReturnValue({
    loading: false,
    links: [],
    hasActiveFilters: false,
    favoritesOnly: false,
    hasMore: false,
    loadingMore: false,
    loadMore: mockLoadMore,
    refreshKey: 0,
    setActiveLink: vi.fn(),
    setEditingLink: vi.fn(),
    handleFavoriteToggle: vi.fn(),
    handleLinkOpen: vi.fn(),
    lastOpenedId: null,
    handleDeleteById: vi.fn(),
    resetFilters: vi.fn(),
    isSelectionMode: false,
    isSelected: () => false,
    toggleSelected: vi.fn(),
    enterSelectionMode: vi.fn(),
    imageStateById: {},
    handleImageError: vi.fn(),
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  observers.length = 0
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { observers.push(callback) }
    observe() {}
    disconnect() {}
  })
  setContext()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('LinkGrid empty state', () => {
  it('shows the empty state when there are no links and nothing left to load', () => {
    render(<LinkGrid />)
    expect(screen.getByText('No links match the current filters.')).toBeTruthy()
  })

  it('shows the favorites empty state when there are no favorites and nothing left to load', () => {
    setContext({ favoritesOnly: true })
    render(<LinkGrid />)
    expect(screen.getByText(/No favorites yet/)).toBeTruthy()
  })

  it('keeps the sentinel instead of the empty state when every loaded link is held back and more pages remain', () => {
    setContext({ hasMore: true })
    render(<LinkGrid />)

    expect(screen.queryByText('No links match the current filters.')).toBeNull()
    expect(observers).toHaveLength(1)
    observers[0]([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    expect(mockLoadMore).toHaveBeenCalledTimes(1)
  })

  it('does not show the favorites empty state while more pages remain', () => {
    setContext({ hasMore: true, favoritesOnly: true })
    render(<LinkGrid />)
    expect(screen.queryByText(/No favorites yet/)).toBeNull()
  })
})

describe('LinkGrid card images', () => {
  const link = (id: string): LinkWithTags => ({
    id, user_id: 'user-1', url: `https://${id}.com`, title: `Link ${id}`,
    description: null, site_name: `${id}.com`, image_url: `https://cdn.example.com/${id}.jpg`, duration: null, notes: null,
    category_id: null, status: 'unread', is_favorite: false, tags: [],
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, moved_to_end_at: null,
  })

  it("passes each card its own image state and reports image errors with that card's id", () => {
    const handleImageError = vi.fn()
    setContext({ links: [link('a'), link('b')], imageStateById: { a: 'refreshing' }, handleImageError })
    const { container } = render(<LinkGrid />)

    expect(screen.getAllByTestId('card-image-refreshing')).toHaveLength(1)
    const images = container.querySelectorAll('img')
    expect(images).toHaveLength(1)
    expect(images[0].getAttribute('src')).toBe('https://cdn.example.com/b.jpg')

    fireEvent.error(images[0])
    expect(handleImageError).toHaveBeenCalledExactlyOnceWith('b')
  })
})
