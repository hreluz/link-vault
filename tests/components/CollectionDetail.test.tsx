// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react'
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
}))
vi.mock('@/lib/services/links', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/links')>()),
  getLinksByIds: vi.fn(),
  updateLinkStatus: vi.fn(async () => true),
  markLinkMovedToEnd: vi.fn(),
}))

import {
  getCollection, getCollectionMemberships, getPrivateTagIdSet, swapCollectionLinkPositions, removeLinkFromCollection,
} from '@/lib/services/collections'
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
  if (!globalThis.CSS?.escape) (globalThis as { CSS?: unknown }).CSS = { escape: (s: string) => s }
})
afterEach(cleanup)

async function renderPage() {
  render(<CollectionDetail collectionId="c1" />)
  await screen.findByRole('heading', { name: /Learn Rust/ })
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
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText(/Delete “Learn Rust”\? Its 2 links stay saved\./)).toBeTruthy()
  })
})
