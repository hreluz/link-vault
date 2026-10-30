// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import LinkGrid from '@/app/dashboard/link/LinkGrid'

const mockUseLinkListContext = vi.fn()
vi.mock('@/app/dashboard/link/LinkListContext', () => ({
  useLinkListContext: () => mockUseLinkListContext(),
}))

vi.mock('@/lib/hooks/categories/useCategoryList', () => ({
  useCategoryList: () => ({ categories: [] }),
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
