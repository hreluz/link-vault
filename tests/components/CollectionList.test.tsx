// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CollectionList from '@/app/dashboard/organize/collections/CollectionList'
import { UnlockedTagsProvider } from '@/lib/context/UnlockedTagsContext'
import { COLLECTION } from '../hooks/collections/fixtures'

const { DEK } = vi.hoisted(() => ({ DEK: {} as CryptoKey }))
vi.mock('@/lib/context/VaultContext', () => ({ useVault: () => ({ dek: DEK }) }))
vi.mock('@/lib/services/collections', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/collections')>()),
  getCollections: vi.fn(),
  getCollectionCounts: vi.fn(),
  createCollection: vi.fn(),
}))
import { getCollections, getCollectionCounts, createCollection } from '@/lib/services/collections'

const COLLECTIONS = [
  { ...COLLECTION, id: 'c1', name: 'Learn Rust', description: 'Ownership and lifetimes' },
  { ...COLLECTION, id: 'c2', name: 'Weekend watch', description: null },
  { ...COLLECTION, id: 'c3', name: 'Go basics', description: 'Goroutines and rust comparisons' },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCollections).mockResolvedValue(COLLECTIONS)
  vi.mocked(getCollectionCounts).mockResolvedValue([])
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function renderList() {
  return render(<UnlockedTagsProvider><CollectionList /></UnlockedTagsProvider>)
}

async function loaded() {
  renderList()
  await screen.findByText('Learn Rust')
  return screen.getByLabelText('Search collections') as HTMLInputElement
}

const names = () => screen.queryAllByRole('link').map(a => a.textContent)
const type = (input: HTMLInputElement, value: string) => fireEvent.change(input, { target: { value } })

describe('CollectionList search', () => {
  it('is hidden while loading', () => {
    vi.mocked(getCollections).mockReturnValue(new Promise(() => {}))
    renderList()
    expect(screen.getByText('Loading collections…')).toBeTruthy()
    expect(screen.queryByLabelText('Search collections')).toBeNull()
  })

  it('is hidden on the load error', async () => {
    vi.mocked(getCollections).mockRejectedValue(new Error('boom'))
    renderList()
    await screen.findByText("Couldn't load your collections.")
    expect(screen.queryByLabelText('Search collections')).toBeNull()
  })

  it('is hidden on the empty state', async () => {
    vi.mocked(getCollections).mockResolvedValue([])
    renderList()
    await screen.findByText('No collections yet.')
    expect(screen.queryByLabelText('Search collections')).toBeNull()
  })

  it('shows the box with its placeholder once collections load', async () => {
    const input = await loaded()
    expect(input.getAttribute('placeholder')).toBe('Search collections')
  })

  it('filters by name, case-insensitive and trimmed, in list order', async () => {
    const input = await loaded()
    type(input, '  WEEKEND ')
    expect(names()).toHaveLength(1)
    expect(names()[0]).toContain('Weekend watch')
  })

  it('filters by description, keeping the list order', async () => {
    const input = await loaded()
    type(input, 'rust')
    expect(names().map(n => n?.includes('Learn Rust') ? 'c1' : n?.includes('Go basics') ? 'c3' : '?')).toEqual(['c1', 'c3'])
  })

  it('shows the description only while searching and only on a description match', async () => {
    const input = await loaded()
    expect(screen.queryAllByTestId('collection-description')).toHaveLength(0)

    type(input, 'rust')
    // "Learn Rust" matched on its name only, so its description stays hidden.
    const shown = screen.getAllByTestId('collection-description').map(el => el.textContent)
    expect(shown).toEqual(['Goroutines and rust comparisons'])

    type(input, '')
    expect(screen.queryAllByTestId('collection-description')).toHaveLength(0)
  })

  it('shows "Showing X of N collections" as a status line while searching, and keeps the header count', async () => {
    const input = await loaded()
    expect(screen.queryByText(/^Showing/)).toBeNull()
    type(input, 'go')
    const line = screen.getByText('Showing 1 of 3 collections')
    expect(line.getAttribute('role')).toBe('status')
    expect(screen.getByText('3 collections')).toBeTruthy()
  })

  it('shows the no-match state; Clear search empties and focuses the box', async () => {
    const input = await loaded()
    type(input, 'python')
    expect(screen.getByText('No collections match "python".')).toBeTruthy()
    expect(names()).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(input.value).toBe('')
    expect(document.activeElement).toBe(input)
    expect(names()).toHaveLength(3)
  })

  it('clears the query after saving a new collection, so it is listed', async () => {
    vi.mocked(createCollection).mockResolvedValue({ data: { ...COLLECTION, id: 'c4', name: 'Fresh' }, error: null })
    const input = await loaded()
    type(input, 'python')
    fireEvent.click(screen.getByRole('button', { name: 'New collection' }))
    fireEvent.change(screen.getByPlaceholderText('Collection name'), { target: { value: 'Fresh' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add collection' }))
    await screen.findByText('Fresh')
    expect(input.value).toBe('')
    expect(names()).toHaveLength(4)
  })
})
