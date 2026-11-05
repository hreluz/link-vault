// @vitest-environment jsdom
// SPEC 34: touch targets, focus ring and ARIA state on /dashboard controls.
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { StatusTabBar } from '@/app/dashboard/link/StatusTabBar'
import FavoritesToggle from '@/app/dashboard/link/FavoritesToggle'
import DashboardNav from '@/app/dashboard/DashboardNav'
import SearchBar from '@/components/SearchBar'
import ExpandToggle from '@/app/dashboard/link/LinkForm/ExpandToggle'
import FilterSheet from '@/app/dashboard/link/FilterSheet'
import UrlField from '@/app/dashboard/link/LinkForm/UrlField'
import { LinkFormContext } from '@/app/dashboard/link/LinkFormContext'
import type { LinkFormContextValue } from '@/app/dashboard/link/LinkFormContext'

const mockUseLinkListContext = vi.fn()
vi.mock('@/app/dashboard/link/LinkListContext', () => ({
  useLinkListContext: () => mockUseLinkListContext(),
}))

let mockPathname = '/dashboard'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))
vi.mock('@/lib/hooks/shared/useScrollToTop', () => ({
  useScrollToTop: () => vi.fn(),
}))

afterEach(cleanup)

function expectTouchSized(el: HTMLElement) {
  expect(el.className).toContain('min-h-11')
  expect(el.className).toContain('focus-ring')
}

describe('StatusTabBar', () => {
  it('marks only the selected pill as pressed', () => {
    render(<StatusTabBar value="read" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Read' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Unread' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('marks All as pressed when no status is selected, and sizes every pill for touch', () => {
    render(<StatusTabBar value={null} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
    for (const button of screen.getAllByRole('button')) {
      expectTouchSized(button)
      expect(button.className).toContain('sm:min-h-9')
    }
  })
})

describe('FavoritesToggle', () => {
  it('reports which view is pressed and hides the star emoji from screen readers', () => {
    mockUseLinkListContext.mockReturnValue({ favoritesOnly: true, setFavoritesOnly: vi.fn() })
    render(<FavoritesToggle />)

    const all = screen.getByRole('button', { name: 'All Links' })
    const favorites = screen.getByRole('button', { name: 'Favorites' })
    expect(all.getAttribute('aria-pressed')).toBe('false')
    expect(favorites.getAttribute('aria-pressed')).toBe('true')
    expectTouchSized(all)
    expectTouchSized(favorites)
  })
})

describe('DashboardNav', () => {
  it('marks the active item with aria-current="page" in both navs', () => {
    mockPathname = '/dashboard/organize'
    render(<DashboardNav />)

    const current = document.querySelectorAll('[aria-current="page"]')
    expect(current).toHaveLength(2)
    for (const el of current) expect(el.textContent).toContain('Organize')
    for (const el of document.querySelectorAll('nav a, nav button')) {
      expect(el.className).toContain('focus-ring')
    }
  })

  it('marks Links as current on the dashboard itself, where it is a scroll-to-top button', () => {
    mockPathname = '/dashboard'
    render(<DashboardNav />)

    const current = document.querySelectorAll('[aria-current="page"]')
    expect(current).toHaveLength(2)
    for (const el of current) {
      expect(el.tagName).toBe('BUTTON')
      expect(el.textContent).toContain('Links')
    }
  })
})

describe('SearchBar', () => {
  it('gives the search input an accessible name', () => {
    render(<SearchBar value="" onChange={vi.fn()} />)
    expect(screen.getByRole('searchbox', { name: 'Search links' })).toBeTruthy()
  })

  it('reports whether the Filters sheet is open', () => {
    const { rerender } = render(<SearchBar value="" onChange={vi.fn()} onFilterOpen={vi.fn()} />)
    const filters = screen.getByRole('button', { name: /Filters/ })
    expect(filters.getAttribute('aria-haspopup')).toBe('dialog')
    expect(filters.getAttribute('aria-expanded')).toBe('false')
    expectTouchSized(filters)

    rerender(<SearchBar value="" onChange={vi.fn()} onFilterOpen={vi.fn()} filterOpen />)
    expect(screen.getByRole('button', { name: /Filters/ }).getAttribute('aria-expanded')).toBe('true')
  })
})

describe('ExpandToggle', () => {
  it('reports its expanded state and has a 44px hit area', () => {
    const { rerender } = render(<ExpandToggle expanded={false} onToggle={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'More options' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expectTouchSized(button)

    rerender(<ExpandToggle expanded onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Fewer options' }).getAttribute('aria-expanded')).toBe('true')
  })
})

describe('FilterSheet', () => {
  const props = {
    isOpen: true, sortBy: 'newest' as const, category: 'all', categories: [],
    selectedTagIds: ['t1'], tagMode: 'any' as const, allTags: [{ id: 't1', name: 'react' }], resultCount: 3,
    onSortChange: vi.fn(), onCategoryChange: vi.fn(), onTagsChange: vi.fn(), onTagModeChange: vi.fn(),
    onReset: vi.fn(), onClose: vi.fn(),
  }

  it('reports each accordion section as expanded or collapsed', () => {
    render(<FilterSheet {...props} />)

    // Tags starts open because a tag is selected; Sort starts closed.
    const sort = screen.getByRole('button', { name: /^Sort by/ })
    expect(sort.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(sort)
    expect(sort.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: /^Tags/ }).getAttribute('aria-expanded')).toBe('true')
  })

  it('sizes chips and the any/all toggle for touch, and marks the active tag mode', () => {
    render(<FilterSheet {...props} />)

    expectTouchSized(screen.getByRole('button', { name: 'react' }))
    const any = screen.getByRole('button', { name: 'any' })
    expectTouchSized(any)
    expect(any.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'all' }).getAttribute('aria-pressed')).toBe('false')
  })
})

describe('UrlField auto-fetch switch', () => {
  function renderUrlField(autoFetch: boolean) {
    const value = {
      mode: 'add', url: '', setUrl: vi.fn(), fetchingMeta: false,
      autoFetch, toggleAutoFetch: vi.fn(), duplicateLinkId: null,
    } as unknown as LinkFormContextValue
    return render(
      <LinkFormContext.Provider value={value}>
        <UrlField />
      </LinkFormContext.Provider>,
    )
  }

  it('is a switch named by its visible text, with its on/off state', () => {
    renderUrlField(true)
    const toggle = screen.getByRole('switch', { name: 'Auto-fetch' })
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    expectTouchSized(toggle)
  })

  it('reports off when auto-fetch is disabled', () => {
    renderUrlField(false)
    expect(screen.getByRole('switch', { name: 'Auto-fetch' }).getAttribute('aria-checked')).toBe('false')
  })
})
