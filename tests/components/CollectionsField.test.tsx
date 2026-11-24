// @vitest-environment jsdom
import React, { useState } from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import CollectionsField from '@/app/dashboard/link/LinkForm/CollectionsField'
import { LinkFormContext, type LinkFormContextValue } from '@/app/dashboard/link/LinkFormContext'
import { useDialog } from '@/lib/hooks/shared/useDialog'
import type { Collection } from '@/lib/services/collections'

const { DEK } = vi.hoisted(() => ({ DEK: {} as CryptoKey }))
vi.mock('@/lib/context/VaultContext', () => ({ useVault: () => ({ dek: DEK }) }))
vi.mock('@/lib/services/collections', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/collections')>()),
  getCollections: vi.fn(),
}))
import { getCollections } from '@/lib/services/collections'

const col = (id: string, name: string): Collection =>
  ({ id, user_id: 'u1', name, emoji: null, description: null, created_at: 't', updated_at: 't' })

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCollections).mockResolvedValue([col('r', 'Learn Rust'), col('v', 'Rust videos'), col('g', 'Go')])
})

type HarnessProps = { initialIds?: string[]; membershipState?: 'loading' | 'error' | 'ready'; onSubmit?: () => void; onClose?: () => void }

function Harness({ initialIds = [], membershipState = 'ready', onSubmit = vi.fn(), onClose = vi.fn() }: HarnessProps) {
  const [collectionIds, setCollectionIds] = useState<string[]>(initialIds)
  const [newCollectionNames, setNewCollectionNames] = useState<string[]>([])
  const dialog = useDialog({ isOpen: true, onClose })
  const value = { collectionIds, setCollectionIds, newCollectionNames, setNewCollectionNames, membershipState } as unknown as LinkFormContextValue
  return (
    <div {...dialog.dialogProps} aria-labelledby={undefined} aria-label="Edit link">
      <LinkFormContext.Provider value={value}>
        <form onSubmit={e => { e.preventDefault(); onSubmit() }}>
          <CollectionsField />
          <button type="submit">Save</button>
        </form>
      </LinkFormContext.Provider>
      <output data-testid="state">{JSON.stringify({ collectionIds, newCollectionNames })}</output>
    </div>
  )
}

const state = () => JSON.parse(screen.getByTestId('state').textContent!) as { collectionIds: string[]; newCollectionNames: string[] }

async function setup(props: HarnessProps = {}) {
  render(<Harness {...props} />)
  const input = screen.getByRole('combobox', { name: 'Collections' }) as HTMLInputElement
  await waitFor(() => expect(input.disabled).toBe(false))
  input.focus()
  return input
}

const optionNames = () => screen.queryAllByRole('option').map(o => o.textContent)

describe('CollectionsField', () => {
  it('shows no list on an empty input', async () => {
    const input = await setup()
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(input.placeholder).toBe('Add to a collection…')
  })

  it('filters case-insensitively', async () => {
    const input = await setup()
    fireEvent.change(input, { target: { value: 'RUST' } })
    expect(optionNames()).toEqual(['Learn Rust', 'Rust videos', '+ Create “RUST”'])
    expect(input.getAttribute('aria-expanded')).toBe('true')
  })

  it('lists at most 8 matches plus the Create row', async () => {
    vi.mocked(getCollections).mockResolvedValue(Array.from({ length: 10 }, (_, i) => col(`c${i}`, `Rust ${i}`)))
    const input = await setup()
    fireEvent.change(input, { target: { value: 'rust' } })
    expect(optionNames()).toHaveLength(9)
    expect(optionNames()[8]).toBe('+ Create “rust”')
  })

  it('leaves out already selected collections', async () => {
    const input = await setup({ initialIds: ['r'] })
    fireEvent.change(input, { target: { value: 'rust' } })
    expect(optionNames()).toEqual(['Rust videos', '+ Create “rust”'])
  })

  it('hides Create on an exact match, selected or not, and shows it for a partial name', async () => {
    const input = await setup({ initialIds: ['r'] })
    fireEvent.change(input, { target: { value: 'learn rust' } })
    expect(optionNames()).toEqual([])
    fireEvent.change(input, { target: { value: 'learn rus' } })
    expect(optionNames()).toEqual(['+ Create “learn rus”'])
  })

  it('Enter on a highlighted row adds its chip, clears the input, keeps focus and does not submit', async () => {
    const onSubmit = vi.fn()
    const input = await setup({ onSubmit })
    fireEvent.change(input, { target: { value: 'rust' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[1].id)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(state().collectionIds).toEqual(['v'])
    expect(input.value).toBe('')
    expect(document.activeElement).toBe(input)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Remove from Rust videos' })).toBeTruthy()
  })

  it('Enter with no highlight picks an unselected exact match', async () => {
    const input = await setup()
    fireEvent.change(input, { target: { value: 'go' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(state().collectionIds).toEqual(['g'])
  })

  it('Enter otherwise picks Create, which adds a pending chip with a "new" label', async () => {
    const input = await setup()
    fireEvent.change(input, { target: { value: '  Go basics ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(state().newCollectionNames).toEqual(['Go basics'])
    expect(screen.getByText('new')).toBeTruthy()
    fireEvent.change(input, { target: { value: 'go basics' } })
    expect(optionNames()).toEqual([])
  })

  it('a click on a row picks it and keeps focus', async () => {
    const input = await setup()
    fireEvent.change(input, { target: { value: 'videos' } })
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Rust videos' }))
    expect(state().collectionIds).toEqual(['v'])
    expect(document.activeElement).toBe(input)
  })

  it('Escape with the list open closes only the list; with it closed, the modal closes', async () => {
    const onClose = vi.fn()
    const input = await setup({ onClose })
    fireEvent.change(input, { target: { value: 'rust' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Backspace on an empty input removes the last chip, pending or saved', async () => {
    const input = await setup({ initialIds: ['r'] })
    fireEvent.change(input, { target: { value: 'Brand new' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(state()).toEqual({ collectionIds: ['r'], newCollectionNames: [] })
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(state().collectionIds).toEqual([])
  })

  it('disables the input with Loading collections… while the link\'s collections load', () => {
    render(<Harness membershipState="loading" />)
    expect((screen.getByRole('combobox') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText('Loading collections…')).toBeTruthy()
  })

  it('shows a load error with Try again, input disabled', async () => {
    vi.mocked(getCollections).mockRejectedValueOnce(new Error('x'))
    render(<Harness />)
    await screen.findByText("Couldn't load your collections.")
    expect((screen.getByRole('combobox') as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect((screen.getByRole('combobox') as HTMLInputElement).disabled).toBe(false))
  })
})
