// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import CollectionDetail from '@/app/dashboard/organize/collections/[id]/CollectionDetail'
import { COLLECTION, makeLink } from '../hooks/collections/fixtures'

const { DEK } = vi.hoisted(() => ({ DEK: {} as CryptoKey }))
vi.mock('@/lib/context/VaultContext', () => ({ useVault: () => ({ dek: DEK }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock('@/lib/hooks/categories/useCategoryList', () => ({ useCategoryList: () => ({ categories: [] }) }))
vi.mock('@/lib/services/collections', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/collections')>()),
  getCollection: vi.fn(),
  getCollectionMemberships: vi.fn(),
  getPrivateTagIdSet: vi.fn(),
  swapCollectionLinkPositions: vi.fn(),
  removeLinkFromCollection: vi.fn(),
  restoreMembership: vi.fn(async () => true),
  addLinksToCollection: vi.fn(),
}))
const { TAGS } = vi.hoisted(() => ({
  TAGS: [{ id: 't-rust', name: 'rust', is_private: false }, { id: 'p', name: 'secret', is_private: true }],
}))
vi.mock('@/lib/utils/scrollVisibility', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/utils/scrollVisibility')>()),
  scrollIntoViewIfHidden: vi.fn(),
}))
vi.mock('@/lib/context/TagsContext', () => ({ useTagsContext: () => ({ tags: TAGS, loading: false, refetchTags: () => {} }) }))
// The real modal is covered in EditLinkModal.test.tsx; this stand-in saves a new title
// and exposes the page's focus fallback.
vi.mock('@/app/dashboard/link/EditLinkModal', () => ({
  default: ({ link, onSave, onClose, fallbackFocus }: {
    link: { id: string } | null
    onSave: (updated: unknown, collectionIds: null) => void
    onClose: () => void
    fallbackFocus?: () => HTMLElement | null
  }) => link && (
    <div role="dialog">
      <button onClick={() => { onSave({ ...link, title: 'Renamed' }, null); onClose(); fallbackFocus?.()?.focus() }}>
        Save edit
      </button>
    </div>
  ),
}))
// Stand-in for the Add links sheet: adds link "n" through the page's onAdd/onAdded.
vi.mock('@/app/dashboard/organize/collections/[id]/AddLinksToCollectionSheet', () => ({
  default: ({ isOpen, onAdd, onAdded, onClose }: {
    isOpen: boolean
    onAdd: (links: unknown[]) => Promise<unknown>
    onAdded: (links: unknown[]) => void
    onClose: () => void
  }) => isOpen && (
    <button onClick={async () => {
      const links = [{ ...NEW_LINK }]
      if (await onAdd(links)) { onClose(); onAdded(links) }
    }}>
      Add stub link
    </button>
  ),
}))
const { NEW_LINK } = vi.hoisted(() => ({
  NEW_LINK: {
    id: 'n', user_id: 'u1', url: 'https://example.com/n', title: 'November', description: null,
    site_name: 'example.com', image_url: null, duration: null, notes: null, category_id: null,
    status: 'unread', is_favorite: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null, moved_to_end_at: null, tags: [],
  },
}))
vi.mock('@/lib/services/links', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/links')>()),
  getLinksByIds: vi.fn(),
  updateLinkStatus: vi.fn(async () => true),
  markLinkMovedToEnd: vi.fn(),
}))

import {
  getCollection, getCollectionMemberships, getPrivateTagIdSet, swapCollectionLinkPositions, removeLinkFromCollection,
  addLinksToCollection,
} from '@/lib/services/collections'
import { toast } from 'sonner'
import { scrollIntoViewIfHidden } from '@/lib/utils/scrollVisibility'
import { UnlockedTagsProvider, useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { getLinksByIds, updateLinkStatus, markLinkMovedToEnd } from '@/lib/services/links'

const membership = (link_id: string, position: number) => ({ collection_id: 'c1', link_id, position, added_at: '2026-01-01T00:00:00Z' })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCollection).mockResolvedValue(COLLECTION)
  vi.mocked(getPrivateTagIdSet).mockResolvedValue(new Set())
  vi.mocked(getCollectionMemberships).mockResolvedValue([membership('a', 1), membership('b', 2), membership('c', 3)])
  vi.mocked(getLinksByIds).mockResolvedValue([
    makeLink('a', { title: 'Alpha', status: 'read' }),
    makeLink('b', { title: 'Bravo' }),
    makeLink('c', { title: 'Charlie' }),
  ])
  vi.mocked(swapCollectionLinkPositions).mockResolvedValue(true)
  vi.mocked(removeLinkFromCollection).mockResolvedValue(true)
  Element.prototype.scrollIntoView = vi.fn()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
  if (!globalThis.CSS?.escape) (globalThis as { CSS?: unknown }).CSS = { escape: (s: string) => s }
})

async function renderPage() {
  const view = render(<CollectionDetail collectionId="c1" />)
  await screen.findByRole('heading', { name: /Learn Rust/ })
  return view
}

const row = (id: string) => document.querySelector<HTMLElement>(`[data-collection-row="${id}"]`)!
const rowIds = () => Array.from(document.querySelectorAll('[data-collection-row]')).map(el => el.getAttribute('data-collection-row'))
const button = (id: string, name: string) => within(row(id)).getByRole('button', { name })

describe('CollectionDetail', () => {
  it('shows the header, counts and the tab title', async () => {
    await renderPage()
    expect(screen.getByText('3 links · 1 done')).toBeTruthy()
    expect(document.title).toBe('Learn Rust — Link Vault')
  })

  it('disables ▲ on the first row and ▼ on the last', async () => {
    await renderPage()
    expect((button('a', 'Move up') as HTMLButtonElement).disabled).toBe(true)
    expect((button('c', 'Move down') as HTMLButtonElement).disabled).toBe(true)
    expect((button('b', 'Move up') as HTMLButtonElement).disabled).toBe(false)
  })

  it('▼ keeps focus on the moved link\'s ▼ and announces the new position', async () => {
    await renderPage()
    button('a', 'Move down').focus()
    await act(async () => { fireEvent.click(button('a', 'Move down')) })
    expect(rowIds()).toEqual(['b', 'a', 'c'])
    expect(document.activeElement).toBe(button('a', 'Move down'))
    expect(screen.getByText('Moved to position 2')).toBeTruthy()
  })

  it('moves focus to ▲ once the row reaches the bottom', async () => {
    await renderPage()
    await act(async () => { fireEvent.click(button('b', 'Move down')) })
    expect(rowIds()).toEqual(['a', 'c', 'b'])
    expect(document.activeElement).toBe(button('b', 'Move up'))
    expect(screen.getByText('Moved to position 3')).toBeTruthy()
  })

  it('marks every ▲/▼ disabled while a swap saves', async () => {
    let resolve: (ok: boolean) => void = () => {}
    vi.mocked(swapCollectionLinkPositions).mockImplementation(() => new Promise(r => { resolve = r }))
    await renderPage()
    act(() => { fireEvent.click(button('a', 'Move down')) })
    expect(button('c', 'Move up').getAttribute('aria-disabled')).toBe('true')
    expect(button('a', 'Move down').getAttribute('aria-disabled')).toBe('true')
    await act(async () => { resolve(true) })
    expect(button('c', 'Move up').getAttribute('aria-disabled')).toBeNull()
  })

  it('after ✕, focus goes to the next row\'s ✕, or the previous one for the last row', async () => {
    await renderPage()
    await act(async () => { fireEvent.click(button('a', 'Remove from collection')) })
    expect(rowIds()).toEqual(['b', 'c'])
    expect(document.activeElement).toBe(button('b', 'Remove from collection'))
    await act(async () => { fireEvent.click(button('c', 'Remove from collection')) })
    expect(document.activeElement).toBe(button('b', 'Remove from collection'))
  })

  it('after removing the last row, focus goes to + Add links', async () => {
    vi.mocked(getCollectionMemberships).mockResolvedValue([membership('a', 1)])
    await renderPage()
    await act(async () => { fireEvent.click(button('a', 'Remove from collection')) })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '+ Add links' }))
  })

  it('Play next opens the first unread/watching link, marks it Last opened and sets it watching', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await renderPage()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play next' })) })
    expect(open).toHaveBeenCalledWith('https://example.com/b', '_blank', 'noopener,noreferrer')
    expect(updateLinkStatus).toHaveBeenCalledWith('b', 'watching')
    expect(within(row('b')).getByText('Last opened')).toBeTruthy()
    expect(markLinkMovedToEnd).not.toHaveBeenCalled()
  })

  it('reads All done, disabled, when every link is read or archived', async () => {
    vi.mocked(getLinksByIds).mockResolvedValue([
      makeLink('a', { status: 'read' }), makeLink('b', { status: 'archived' }), makeLink('c', { status: 'read' }),
    ])
    await renderPage()
    expect((screen.getByRole('button', { name: 'All done' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('has no Send to end button', async () => {
    await renderPage()
    expect(screen.queryByRole('button', { name: 'Send to end' })).toBeNull()
  })

  it('shows Collection not found for an unknown id', async () => {
    vi.mocked(getCollection).mockResolvedValue(null)
    render(<CollectionDetail collectionId="nope" />)
    expect(await screen.findByText('Collection not found')).toBeTruthy()
  })

  it("shows Couldn't load this collection. with Try again", async () => {
    vi.mocked(getCollection).mockRejectedValueOnce(new Error('x'))
    render(<CollectionDetail collectionId="c1" />)
    await screen.findByText("Couldn't load this collection.")
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })) })
    expect(await screen.findByRole('heading', { name: /Learn Rust/ })).toBeTruthy()
  })

  it('asks before deleting with the visible count', async () => {
    vi.mocked(getLinksByIds).mockResolvedValue([
      makeLink('a'), makeLink('b', { deleted_at: '2026-02-01T00:00:00Z' }), makeLink('c'),
    ])
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Collection options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete collection' }))
    expect(screen.getByText(/Delete “Learn Rust”\? Its 2 links stay saved\./)).toBeTruthy()
  })

  it('keeps Edit and Delete in the ··· options sheet, not the header row', async () => {
    await renderPage()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
    const options = screen.getByRole('button', { name: 'Collection options' })
    expect(options.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(options)
    expect(screen.getByRole('dialog', { name: 'Learn Rust' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit collection' }))
    expect(screen.queryByRole('dialog', { name: 'Learn Rust' })).toBeNull()
    expect(screen.getByText('Edit collection')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
  })

  it('focuses Cancel in the delete confirm, and Escape closes it back to ···', async () => {
    await renderPage()
    const options = screen.getByRole('button', { name: 'Collection options' })
    fireEvent.click(options)
    fireEvent.click(screen.getByRole('button', { name: 'Delete collection' }))
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(document.activeElement).toBe(cancel)
    fireEvent.keyDown(cancel, { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Delete collection' })).toBeNull()
    expect(document.activeElement).toBe(options)
  })

  it('offers Add links on an empty collection', async () => {
    vi.mocked(getCollectionMemberships).mockResolvedValue([])
    await renderPage()
    const add = screen.getByRole('button', { name: 'Add links' })
    expect(add.getAttribute('aria-haspopup')).toBe('dialog')
    fireEvent.click(add)
    expect(screen.getByRole('button', { name: 'Add stub link' })).toBeTruthy()
  })
})

describe('CollectionDetail search', () => {
  const searchBox = () => screen.getByLabelText('Search this collection') as HTMLInputElement
  const type = (value: string) => fireEvent.change(searchBox(), { target: { value } })
  const number = (id: string) => row(id).querySelector('span.tabular-nums')!.textContent

  beforeEach(() => {
    vi.mocked(getCollectionMemberships).mockResolvedValue([
      membership('a', 1), membership('b', 2), membership('c', 3), membership('d', 4),
    ])
    vi.mocked(getLinksByIds).mockResolvedValue([
      makeLink('a', { title: 'Async Rust', status: 'read', tags: ['t-rust'] }),
      makeLink('b', { title: 'Go channels' }),
      makeLink('c', { title: 'Rust macros', notes: 'read later' }),
      makeLink('d', { title: 'Python tips' }),
    ])
  })

  it('shows the box between the header and the list', async () => {
    await renderPage()
    const box = searchBox()
    expect(box.compareDocumentPosition(row('a')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Play next' }).compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('is absent on an empty collection, while loading, on errors and on not found', async () => {
    vi.mocked(getCollectionMemberships).mockResolvedValue([])
    const empty = await renderPage()
    expect(screen.getByText('No links in this collection yet.')).toBeTruthy()
    expect(screen.queryByLabelText('Search this collection')).toBeNull()
    empty.unmount()

    vi.mocked(getCollection).mockReturnValue(new Promise(() => {}))
    const loading = render(<CollectionDetail collectionId="c1" />)
    expect(screen.getByText('Loading collection…')).toBeTruthy()
    expect(screen.queryByLabelText('Search this collection')).toBeNull()
    loading.unmount()

    vi.mocked(getCollection).mockRejectedValueOnce(new Error('x'))
    const failed = render(<CollectionDetail collectionId="c1" />)
    await screen.findByText("Couldn't load this collection.")
    expect(screen.queryByLabelText('Search this collection')).toBeNull()
    failed.unmount()

    vi.mocked(getCollection).mockResolvedValue(null)
    render(<CollectionDetail collectionId="nope" />)
    await screen.findByText('Collection not found')
    expect(screen.queryByLabelText('Search this collection')).toBeNull()
  })

  it('filters on every keystroke by title, notes and #tag, keeping full-list numbers', async () => {
    await renderPage()
    type('rust')
    expect(rowIds()).toEqual(['a', 'c'])
    expect([number('a'), number('c')]).toEqual(['1', '3'])
    type('later')
    expect(rowIds()).toEqual(['c'])
    type('#rust')
    expect(rowIds()).toEqual(['a'])
    expect(searchBox().className).toContain('ring-primary-300')
  })

  it('matches an unknown #tag as plain text', async () => {
    await renderPage()
    type('#nosuchtag')
    expect(rowIds()).toEqual([])
    expect(screen.getByText('No links match "#nosuchtag".')).toBeTruthy()
  })

  it('hides ▲/▼ while searching and brings them back on every row after clearing', async () => {
    await renderPage()
    type('rust')
    expect(screen.queryByRole('button', { name: 'Move up' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Move down' })).toBeNull()
    expect(button('a', 'Remove from collection')).toBeTruthy()
    type('')
    expect(screen.getAllByRole('button', { name: 'Move up' })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: 'Move down' })).toHaveLength(4)
  })

  it('shows "Showing X of N links" as a status line and keeps the header count', async () => {
    await renderPage()
    expect(screen.queryByText(/^Showing/)).toBeNull()
    type('rust')
    expect(screen.getByText('Showing 2 of 4 links').getAttribute('role')).toBe('status')
    expect(screen.getByText('4 links · 1 done')).toBeTruthy()
  })

  it('Play next ignores the search: opens the hidden next link, keeps the query and does not scroll', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    await renderPage()
    type('rust')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play next' })) })
    expect(open).toHaveBeenCalledWith('https://example.com/b', '_blank', 'noopener,noreferrer')
    expect(updateLinkStatus).toHaveBeenCalledWith('b', 'watching')
    expect(searchBox().value).toBe('rust')
    expect(scrollIntoViewIfHidden).not.toHaveBeenCalled()
  })

  it('Play next scrolls to its row when the row is shown', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    await renderPage()
    type('go')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play next' })) })
    expect(scrollIntoViewIfHidden).toHaveBeenCalledWith(row('b'))
  })

  it('✕ while searching removes with the toast and focuses the previous shown ✕, then the search box', async () => {
    await renderPage()
    type('rust')
    await act(async () => { fireEvent.click(button('c', 'Remove from collection')) })
    expect(toast).toHaveBeenCalledWith('Removed from Learn Rust', expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }))
    expect(rowIds()).toEqual(['a'])
    expect(document.activeElement).toBe(button('a', 'Remove from collection'))

    await act(async () => { fireEvent.click(button('a', 'Remove from collection')) })
    expect(rowIds()).toEqual([])
    expect(screen.getByText('No links match "rust".')).toBeTruthy()
    expect(document.activeElement).toBe(searchBox())
  })

  it('✕ on the only visible link while searching clears the query and focuses + Add links; Undo keeps the box empty', async () => {
    vi.mocked(getCollectionMemberships).mockResolvedValue([membership('a', 1)])
    await renderPage()
    type('rust')
    await act(async () => { fireEvent.click(button('a', 'Remove from collection')) })
    expect(screen.getByText('No links in this collection yet.')).toBeTruthy()
    expect(screen.queryByLabelText('Search this collection')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '+ Add links' }))

    const undo = vi.mocked(toast).mock.calls.at(-1)![1] as { action: { onClick: () => Promise<void> } }
    await act(async () => { await undo.action.onClick() })
    expect(rowIds()).toEqual(['a'])
    expect(searchBox().value).toBe('')
  })

  it('locking private tags until the collection is empty clears the query', async () => {
    vi.mocked(getCollectionMemberships).mockResolvedValue([membership('a', 1)])
    vi.mocked(getLinksByIds).mockResolvedValue([makeLink('a', { title: 'Secret rust', tags: ['p'] })])
    let unlocked: ReturnType<typeof useUnlockedTags> | null = null
    function Grab() { unlocked = useUnlockedTags(); return null }
    render(<UnlockedTagsProvider><Grab /><CollectionDetail collectionId="c1" /></UnlockedTagsProvider>)
    await screen.findByRole('heading', { name: /Learn Rust/ })
    act(() => unlocked!.unlockTag('p'))
    type('rust')
    expect(rowIds()).toEqual(['a'])

    act(() => unlocked!.lockAll())
    expect(screen.getByText('No links in this collection yet.')).toBeTruthy()
    act(() => unlocked!.unlockTag('p'))
    expect(rowIds()).toEqual(['a'])
    expect(searchBox().value).toBe('')
  })

  it('Clear search empties and focuses the box', async () => {
    await renderPage()
    type('zzz')
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(searchBox().value).toBe('')
    expect(document.activeElement).toBe(searchBox())
    expect(rowIds()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('+ Add links clears the query and scrolls to the first new link', async () => {
    vi.mocked(addLinksToCollection).mockResolvedValue([membership('n', 5)])
    await renderPage()
    type('rust')
    fireEvent.click(screen.getByRole('button', { name: '+ Add links' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add stub link' })) })
    expect(searchBox().value).toBe('')
    expect(rowIds()).toEqual(['a', 'b', 'c', 'd', 'n'])
    expect(scrollIntoViewIfHidden).toHaveBeenLastCalledWith(row('n'))
  })

  it('an edit that stops a row matching removes it and sends focus to the search box', async () => {
    await renderPage()
    type('macros')
    fireEvent.click(within(row('c')).getByRole('button', { name: /edit/i }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save edit' })) })
    expect(rowIds()).toEqual([])
    expect(document.activeElement).toBe(searchBox())
  })

  it('a status change never hides a shown row', async () => {
    await renderPage()
    type('go')
    fireEvent.click(within(row('b')).getByRole('button', { name: 'Link options' }))
    await act(async () => { fireEvent.click(screen.getByRole('radio', { name: /^Read/ })) })
    expect(rowIds()).toEqual(['b'])
  })

  it('starts with an empty box when the page is mounted again', async () => {
    const first = await renderPage()
    type('rust')
    first.unmount()
    await renderPage()
    expect(searchBox().value).toBe('')
  })
})
