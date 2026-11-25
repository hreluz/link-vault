// @vitest-environment jsdom
import React, { useState } from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import CollectionPickerSheet from '@/components/CollectionPickerSheet'
import BottomSheet from '@/app/dashboard/link/BottomSheet'
import type { Collection } from '@/lib/services/collections'
import { makeLink } from '../hooks/collections/fixtures'

const { DEK } = vi.hoisted(() => ({ DEK: {} as CryptoKey }))
vi.mock('@/lib/context/VaultContext', () => ({ useVault: () => ({ dek: DEK }) }))
vi.mock('@/lib/services/collections', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/collections')>()),
  getCollections: vi.fn(),
  getCollectionIdsForLink: vi.fn(),
  addLinksToCollection: vi.fn(),
  removeLinkFromCollection: vi.fn(),
  createCollection: vi.fn(),
}))
import {
  getCollections, getCollectionIdsForLink, addLinksToCollection, createCollection,
} from '@/lib/services/collections'

const LINK = makeLink('l1')
const col = (id: string, name: string, emoji: string | null = null): Collection =>
  ({ id, user_id: 'u1', name, emoji, description: null, created_at: 't', updated_at: 't' })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCollections).mockResolvedValue([col('r', 'Learn Rust', '🎓'), col('v', 'Rust videos')])
  vi.mocked(getCollectionIdsForLink).mockResolvedValue(['r'])
})
afterEach(cleanup)

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button data-testid="opener" onClick={() => setOpen(true)}>Open</button>
      <CollectionPickerSheet link={open ? LINK : null} onClose={() => setOpen(false)} />
    </>
  )
}

function openSheet() {
  render(<Harness />)
  const opener = screen.getByTestId('opener')
  opener.focus()
  fireEvent.click(opener)
  return opener
}

async function loaded() {
  await waitFor(() => expect((screen.getByRole('searchbox', { name: 'Search or create a collection' }) as HTMLInputElement).disabled).toBe(false))
  return screen.getByRole('searchbox', { name: 'Search or create a collection' }) as HTMLInputElement
}

describe('CollectionPickerSheet', () => {
  it('is a dialog named "Add to collection" with the input at the top', async () => {
    openSheet()
    const dialog = screen.getByRole('dialog', { name: 'Add to collection' })
    const input = await loaded()
    expect(input.placeholder).toBe('Search or create…')
    expect(input.maxLength).toBe(60)
    expect(input.hasAttribute('data-autofocus')).toBe(true)
    expect(dialog.querySelectorAll('input[type="search"]')).toHaveLength(1)
  })

  it('shows Loading collections… with the input disabled while loading', () => {
    vi.mocked(getCollections).mockReturnValue(new Promise(() => {}))
    openSheet()
    expect(screen.getByText('Loading collections…')).toBeTruthy()
    expect((screen.getByRole('searchbox') as HTMLInputElement).disabled).toBe(true)
  })

  it('shows a load error with Try again', async () => {
    vi.mocked(getCollections).mockRejectedValueOnce(new Error('x'))
    openSheet()
    await screen.findByText("Couldn't load your collections.")
    expect((screen.getByRole('searchbox') as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await loaded()
  })

  it("lists only the link's collections, ticked, plus the hint", async () => {
    openSheet()
    await loaded()
    expect((screen.getByRole('checkbox', { name: /Learn Rust/ }) as HTMLInputElement).checked).toBe(true)
    expect(screen.queryByRole('checkbox', { name: /Rust videos/ })).toBeNull()
    expect(screen.getByText('Type to find or create a collection.')).toBeTruthy()
  })

  it('shows only the empty-state line for a user with no collections', async () => {
    vi.mocked(getCollections).mockResolvedValue([])
    vi.mocked(getCollectionIdsForLink).mockResolvedValue([])
    openSheet()
    await loaded()
    expect(screen.getByText('No collections yet. Type a name to create one.')).toBeTruthy()
    expect(screen.queryByText('Type to find or create a collection.')).toBeNull()
  })

  it('lists typed matches and the Create row only without an exact match', async () => {
    openSheet()
    const input = await loaded()
    fireEvent.change(input, { target: { value: 'rust' } })
    expect((screen.getByRole('checkbox', { name: /Learn Rust/ }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: /Rust videos/ }) as HTMLInputElement).checked).toBe(false)
    expect(screen.getByRole('button', { name: '+ Create “rust”' })).toBeTruthy()
    fireEvent.change(input, { target: { value: 'Learn Rust' } })
    expect(screen.queryByRole('button', { name: /\+ Create/ })).toBeNull()
  })

  it('ticking a typed match adds the link right away', async () => {
    vi.mocked(addLinksToCollection).mockResolvedValue([{ collection_id: 'v', link_id: 'l1', position: 1, added_at: 't' }])
    openSheet()
    const input = await loaded()
    fireEvent.change(input, { target: { value: 'videos' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Rust videos/ }))
    await waitFor(() => expect(addLinksToCollection).toHaveBeenCalledWith('v', ['l1']))
    expect((screen.getByRole('checkbox', { name: /Rust videos/ }) as HTMLInputElement).checked).toBe(true)
  })

  it('Enter with an unknown name creates it with the link ticked', async () => {
    vi.mocked(createCollection).mockResolvedValue({ data: col('n', 'Go basics'), error: null })
    vi.mocked(addLinksToCollection).mockResolvedValue([{ collection_id: 'n', link_id: 'l1', position: 1, added_at: 't' }])
    openSheet()
    const input = await loaded()
    fireEvent.change(input, { target: { value: 'Go basics' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect((screen.getByRole('checkbox', { name: /Go basics/ }) as HTMLInputElement).checked).toBe(true))
    expect(input.value).toBe('')
  })

  it('closes on Escape and returns focus to its opener', async () => {
    const opener = openSheet()
    await loaded()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('traps Tab inside the sheet', async () => {
    openSheet()
    await loaded()
    const dialog = screen.getByRole('dialog')
    const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'))
    items[items.length - 1].focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(items[0])
  })
})

describe('BottomSheet Add to collection row', () => {
  it('shows the row only when onAddToCollection is given, and calls it with the link', () => {
    const onAdd = vi.fn()
    const { rerender } = render(<BottomSheet link={LINK} onStatusChange={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Add to collection/ })).toBeNull()
    rerender(<BottomSheet link={LINK} onStatusChange={vi.fn()} onClose={vi.fn()} onAddToCollection={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /Add to collection…/ }))
    expect(onAdd).toHaveBeenCalledWith(LINK)
  })
})
