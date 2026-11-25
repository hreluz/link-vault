// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCollectionListSearch } from '@/lib/hooks/collections/useCollectionListSearch'

const items = [
  { id: 'c1', name: 'Learn Rust', description: 'Ownership and lifetimes' },
  { id: 'c2', name: 'Weekend', description: null },
  { id: 'c3', name: 'Go basics', description: 'Goroutines' },
]

describe('useCollectionListSearch', () => {
  it('starts with an empty query and every collection', () => {
    const { result } = renderHook(() => useCollectionListSearch(items))
    expect(result.current.query).toBe('')
    expect(result.current.isSearching).toBe(false)
    expect(result.current.filteredCollections).toEqual(items)
  })

  it('filters by name or description on every change', () => {
    const { result } = renderHook(() => useCollectionListSearch(items))
    act(() => result.current.setQuery('week'))
    expect(result.current.filteredCollections.map(c => c.id)).toEqual(['c2'])
    act(() => result.current.setQuery('lifetimes'))
    expect(result.current.filteredCollections.map(c => c.id)).toEqual(['c1'])
    expect(result.current.isSearching).toBe(true)
  })

  it('treats a whitespace-only query as no search', () => {
    const { result } = renderHook(() => useCollectionListSearch(items))
    act(() => result.current.setQuery('   '))
    expect(result.current.isSearching).toBe(false)
    expect(result.current.filteredCollections).toHaveLength(3)
  })

  it('follows changes to the collections list', () => {
    const { result, rerender } = renderHook(({ list }) => useCollectionListSearch(list), { initialProps: { list: items } })
    act(() => result.current.setQuery('rust'))
    rerender({ list: [{ id: 'c4', name: 'Rust videos', description: null }, ...items] })
    expect(result.current.filteredCollections.map(c => c.id)).toEqual(['c4', 'c1'])
  })

  it('clearSearch empties the query', () => {
    const { result } = renderHook(() => useCollectionListSearch(items))
    act(() => result.current.setQuery('go'))
    act(() => result.current.clearSearch())
    expect(result.current.query).toBe('')
    expect(result.current.filteredCollections).toHaveLength(3)
  })
})
