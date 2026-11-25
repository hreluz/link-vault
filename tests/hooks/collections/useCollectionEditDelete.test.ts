// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useCollectionEditForm } from '@/lib/hooks/collections/useCollectionEditForm'
import { useCollectionDeleteFlow } from '@/lib/hooks/collections/useCollectionDeleteFlow'
import { findPlayNext } from '@/lib/hooks/collections/useCollectionDetail'
import type { Collection } from '@/lib/services/collections'
import { COLLECTION, makeRow } from './fixtures'

vi.mock('@/lib/services/collections', () => ({ updateCollection: vi.fn(), deleteCollection: vi.fn() }))
const { addToast, push } = vi.hoisted(() => ({ addToast: vi.fn(), push: vi.fn() }))
vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ addToast, dismissToast: vi.fn() }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { updateCollection, deleteCollection } from '@/lib/services/collections'

const DEK = {} as CryptoKey

function useEditHarness() {
  const [collection, setCollection] = useState<Collection | null>(COLLECTION)
  return { collection, ...useCollectionEditForm(collection, setCollection, DEK) }
}

beforeEach(() => vi.clearAllMocks())

describe('useCollectionEditForm', () => {
  it('opens with the current values', () => {
    const { result } = renderHook(() => useEditHarness())
    act(() => result.current.startEdit())
    expect(result.current.editName).toBe('Learn Rust')
    expect(result.current.editEmoji).toBe('🎓')
  })

  it('refuses an empty name', async () => {
    const { result } = renderHook(() => useEditHarness())
    act(() => { result.current.startEdit(); result.current.setEditName('  ') })
    await act(() => result.current.handleSaveEdit())
    expect(result.current.editError).toBe('Name is required.')
    expect(updateCollection).not.toHaveBeenCalled()
  })

  it('saves and closes', async () => {
    vi.mocked(updateCollection).mockResolvedValue({ data: { ...COLLECTION, name: 'Learn Go' }, error: null })
    const { result } = renderHook(() => useEditHarness())
    act(() => { result.current.startEdit(); result.current.setEditName(' Learn Go ') })
    await act(() => result.current.handleSaveEdit())
    expect(result.current.collection?.name).toBe('Learn Go')
    expect(result.current.editing).toBe(false)
  })

  it('keeps the form open on a failed save', async () => {
    vi.mocked(updateCollection).mockResolvedValue({ data: null, error: 'db_error' })
    const { result } = renderHook(() => useEditHarness())
    act(() => { result.current.startEdit(); result.current.setEditName('Learn Go') })
    await act(() => result.current.handleSaveEdit())
    expect(result.current.editError).toBe("Couldn't save the collection. Try again.")
    expect(result.current.editing).toBe(true)
    expect(result.current.editName).toBe('Learn Go')
  })
})

describe('useCollectionDeleteFlow', () => {
  it('deletes, toasts and navigates back to the list', async () => {
    vi.mocked(deleteCollection).mockResolvedValue(true)
    const { result } = renderHook(() => useCollectionDeleteFlow(COLLECTION))
    act(() => result.current.askDelete())
    await act(() => result.current.handleDelete())
    expect(addToast).toHaveBeenCalledWith('Deleted Learn Rust')
    expect(push).toHaveBeenCalledWith('/dashboard/organize/collections')
  })

  it('keeps the confirm open with a toast when the delete fails', async () => {
    vi.mocked(deleteCollection).mockResolvedValue(false)
    const { result } = renderHook(() => useCollectionDeleteFlow(COLLECTION))
    act(() => result.current.askDelete())
    await act(() => result.current.handleDelete())
    expect(result.current.confirmingDelete).toBe(true)
    expect(addToast).toHaveBeenCalledWith('Failed to delete collection', 'destructive')
    expect(push).not.toHaveBeenCalled()
  })
})

describe('findPlayNext', () => {
  it('picks the first unread or watching row in collection order', () => {
    const rows = [makeRow('a', 1, { status: 'read' }), makeRow('b', 2, { status: 'watching' }), makeRow('c', 3)]
    expect(findPlayNext(rows)?.link.id).toBe('b')
  })

  it('returns null when everything is read or archived', () => {
    expect(findPlayNext([makeRow('a', 1, { status: 'read' }), makeRow('b', 2, { status: 'archived' })])).toBeNull()
  })
})
