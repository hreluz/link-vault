// @vitest-environment jsdom
// SPEC 46: LinkModals owns the collection picker for /dashboard cards, opened from
// a card's ··· menu or its "+N" chip button.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import type { LinkWithTags } from '@/lib/services/links'

const { mockUseLinkListContext, pickerProps, bottomSheetProps } = vi.hoisted(() => ({
  mockUseLinkListContext: vi.fn(),
  pickerProps: { current: null as null | Record<string, unknown> },
  bottomSheetProps: { current: null as null | Record<string, unknown> },
}))

vi.mock('@/app/dashboard/link/LinkListContext', () => ({
  useLinkListContext: () => mockUseLinkListContext(),
}))
vi.mock('@/lib/hooks/categories/useCategoryList', () => ({ useCategoryList: () => ({ categories: [] }) }))
vi.mock('@/lib/hooks/tags/useAvailableTags', () => ({ useAvailableTagsWithIds: () => [] }))
vi.mock('@/app/dashboard/link/AddLinkModal', () => ({ default: () => null }))
vi.mock('@/app/dashboard/link/EditLinkModal', () => ({ default: () => null }))
vi.mock('@/app/dashboard/link/FilterSheet', () => ({ default: () => null }))
vi.mock('@/app/dashboard/link/BottomSheet', () => ({
  default: (props: Record<string, unknown>) => { bottomSheetProps.current = props; return null },
}))
vi.mock('@/components/CollectionPickerSheet', () => ({
  default: (props: Record<string, unknown>) => { pickerProps.current = props; return null },
}))

import LinkModals from '@/app/dashboard/link/LinkModals'

const LINK: LinkWithTags = {
  id: 'l1', user_id: 'user-1', url: 'https://alpha.com', title: 'Alpha',
  description: null, site_name: 'alpha.com', image_url: null, duration: null, notes: null,
  category_id: null, status: 'unread', is_favorite: false, tags: [],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, moved_to_end_at: null,
}

function setContext(overrides: Record<string, unknown> = {}) {
  mockUseLinkListContext.mockReturnValue({
    modalOpen: false, setModalOpen: vi.fn(), filterOpen: false, setFilterOpen: vi.fn(),
    editingLink: null, setEditingLink: vi.fn(), activeLink: null, setActiveLink: vi.fn(),
    sortBy: 'newest', setSortBy: vi.fn(), category: '', setCategory: vi.fn(),
    selectedTagIds: [], setSelectedTagIds: vi.fn(), tagMode: 'any', setTagMode: vi.fn(),
    totalCount: 0, handleCreate: vi.fn(), handleEdit: vi.fn(), handleStatusChange: vi.fn(),
    resetFilters: vi.fn(), addToast: vi.fn(), pendingCapture: null, setPendingCapture: vi.fn(),
    autoFetchDefault: true,
    pickerLink: null, pickerOrigin: 'menu', openCollectionPicker: vi.fn(), closeCollectionPicker: vi.fn(),
    applyMembershipChange: vi.fn(),
    ...overrides,
  })
}

// A card in the page with a "+N" button and a ··· button.
function mountCard({ withMore = true } = {}) {
  const card = document.createElement('article')
  card.setAttribute('data-link-id', LINK.id)
  card.innerHTML = `${withMore ? `<button data-collections-more="${LINK.id}">+3</button>` : ''}<button aria-label="Link options">···</button>`
  document.body.appendChild(card)
  return {
    more: card.querySelector('button[data-collections-more]'),
    options: card.querySelector('button[aria-label="Link options"]'),
    remove: () => card.remove(),
  }
}

function returnFocus() {
  return (pickerProps.current!.returnFocus as () => HTMLElement | null)()
}

beforeEach(() => {
  // jsdom has no CSS.escape; the ids here need no escaping.
  if (!globalThis.CSS?.escape) vi.stubGlobal('CSS', { escape: (value: string) => value })
  pickerProps.current = null
  bottomSheetProps.current = null
  setContext()
})

afterEach(() => vi.unstubAllGlobals())

describe('LinkModals collection picker', () => {
  it('opens the picker from the ··· menu with origin "menu"', () => {
    const openCollectionPicker = vi.fn()
    const setActiveLink = vi.fn()
    setContext({ openCollectionPicker, setActiveLink })
    render(<LinkModals />)

    ;(bottomSheetProps.current!.onAddToCollection as (l: LinkWithTags) => void)(LINK)
    expect(setActiveLink).toHaveBeenCalledWith(null)
    expect(openCollectionPicker).toHaveBeenCalledExactlyOnceWith(LINK, 'menu')
  })

  it('returns focus to "+N" when the picker was opened from it', () => {
    const card = mountCard()
    setContext({ pickerLink: LINK, pickerOrigin: 'more' })
    render(<LinkModals />)
    expect(returnFocus()).toBe(card.more)
    card.remove()
  })

  it('falls back to ··· when "+N" is gone after unticks', () => {
    const card = mountCard({ withMore: false })
    setContext({ pickerLink: LINK, pickerOrigin: 'more' })
    render(<LinkModals />)
    expect(returnFocus()).toBe(card.options)
    card.remove()
  })

  it('returns focus to ··· when the picker was opened from the menu', () => {
    const card = mountCard()
    setContext({ pickerLink: LINK, pickerOrigin: 'menu' })
    render(<LinkModals />)
    expect(returnFocus()).toBe(card.options)
    card.remove()
  })

  it('forwards picker ticks to applyMembershipChange and closes through closeCollectionPicker', () => {
    const applyMembershipChange = vi.fn()
    const closeCollectionPicker = vi.fn()
    setContext({ pickerLink: LINK, applyMembershipChange, closeCollectionPicker })
    render(<LinkModals />)

    const membership = { collection_id: 'c1', link_id: LINK.id, position: 1, added_at: 't' }
    ;(pickerProps.current!.onMembershipChange as (...args: unknown[]) => void)(LINK, 'c1', true, membership)
    expect(applyMembershipChange).toHaveBeenCalledExactlyOnceWith(LINK.id, 'c1', true, membership)

    ;(pickerProps.current!.onClose as () => void)()
    expect(closeCollectionPicker).toHaveBeenCalledTimes(1)
  })
})
