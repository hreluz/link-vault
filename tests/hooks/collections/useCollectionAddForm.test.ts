// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useCollectionAddForm } from '@/lib/hooks/collections/useCollectionAddForm'
import type { Collection } from '@/lib/services/collections'

vi.mock('@/lib/services/collections', () => ({ createCollection: vi.fn() }))
import { createCollection } from '@/lib/services/collections'
const mockCreate = vi.mocked(createCollection)

const DEK = {} as CryptoKey
const existing: Collection = {
  id: 'c1', user_id: 'u1', name: 'Learn Rust', emoji: null, description: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
}

function useHarness() {
  const [collections, setCollections] = useState<Collection[]>([existing])
  return { collections, ...useCollectionAddForm(setCollections, DEK) }
}

beforeEach(() => vi.clearAllMocks())

describe('useCollectionAddForm', () => {
  it('refuses a whitespace-only name with "Name is required." and does not call the service', async () => {
    const { result } = renderHook(() => useHarness())
    act(() => { result.current.openAdd(); result.current.setNewName('   ') })
    await act(() => result.current.handleAdd())
    expect(result.current.addError).toBe('Name is required.')
    expect(mockCreate).not.toHaveBeenCalled()
    expect(result.current.adding).toBe(true)
  })

  it('creates the collection, prepends it and closes the form', async () => {
    const created = { ...existing, id: 'c2', name: 'Learn Go', emoji: '🎓' }
    mockCreate.mockResolvedValue({ data: created, error: null })
    const { result } = renderHook(() => useHarness())
    act(() => { result.current.openAdd(); result.current.setNewName('  Learn Go  '); result.current.setNewEmoji('🎓') })
    await act(() => result.current.handleAdd())
    expect(mockCreate).toHaveBeenCalledWith({ name: '  Learn Go  ', emoji: '🎓', description: '' }, DEK)
    expect(result.current.collections.map(c => c.id)).toEqual(['c2', 'c1'])
    expect(result.current.adding).toBe(false)
    expect(result.current.newName).toBe('')
  })

  it('allows a duplicate name (no duplicate check)', async () => {
    mockCreate.mockResolvedValue({ data: { ...existing, id: 'c3' }, error: null })
    const { result } = renderHook(() => useHarness())
    act(() => { result.current.openAdd(); result.current.setNewName('Learn Rust') })
    await act(() => result.current.handleAdd())
    expect(result.current.addError).toBeNull()
    expect(result.current.collections.filter(c => c.name === 'Learn Rust')).toHaveLength(2)
  })

  it('keeps the form open with what was typed on a failed save', async () => {
    mockCreate.mockResolvedValue({ data: null, error: 'db_error' })
    const { result } = renderHook(() => useHarness())
    act(() => { result.current.openAdd(); result.current.setNewName('Learn Go'); result.current.setNewDescription('d') })
    await act(() => result.current.handleAdd())
    expect(result.current.addError).toBe("Couldn't save the collection. Try again.")
    expect(result.current.adding).toBe(true)
    expect(result.current.newName).toBe('Learn Go')
    expect(result.current.newDescription).toBe('d')
  })
})
