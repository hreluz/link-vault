// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createElement, useState, type ReactNode } from 'react'
import { useCollectionSearch } from '@/lib/hooks/collections/useCollectionSearch'
import { useCollectionLinks, type CollectionLinkRow } from '@/lib/hooks/collections/useCollectionLinks'
import { UnlockedTagsProvider, useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { COLLECTION, makeLink, makeRow } from './fixtures'

const TAGS = [
  { id: 't-rust', name: 'rust', is_private: false },
  { id: 't-go', name: 'golang', is_private: false },
  { id: 'p', name: 'secret', is_private: true },
]
vi.mock('@/lib/context/TagsContext', () => ({ useTagsContext: () => ({ tags: TAGS, loading: false, refetchTags: () => {} }) }))
vi.mock('@/lib/services/collections', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/collections')>()),
  getCollection: vi.fn(),
  getCollectionMemberships: vi.fn(),
  getPrivateTagIdSet: vi.fn(),
}))
vi.mock('@/lib/services/links', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/links')>()),
  getLinksByIds: vi.fn(),
}))
import { getCollection, getCollectionMemberships, getPrivateTagIdSet } from '@/lib/services/collections'
import { getLinksByIds } from '@/lib/services/links'

const ROWS: CollectionLinkRow[] = [
  makeRow('a', 1, { title: 'Async Rust', tags: ['t-rust'] }),
  makeRow('b', 2, { title: 'Go channels', tags: ['t-go'] }),
  makeRow('c', 3, { title: 'Rust macros', notes: 'read later', tags: [] }),
  makeRow('d', 4, { title: 'Python tips', tags: [] }),
]

const ids = (rows: { link: { id: string } }[]) => rows.map(r => r.link.id)

beforeEach(() => vi.clearAllMocks())

describe('useCollectionSearch', () => {
  it('shows every row, numbered 1..N, with an empty query', () => {
    const { result } = renderHook(() => useCollectionSearch(ROWS))
    expect(result.current.isSearching).toBe(false)
    expect(result.current.shownRows.map(r => `${r.number}:${r.link.id}`)).toEqual(['1:a', '2:b', '3:c', '4:d'])
  })

  it('matches free text on title, notes and tag names', () => {
    const { result } = renderHook(() => useCollectionSearch(ROWS))
    act(() => result.current.setQuery('rust'))
    expect(ids(result.current.shownRows)).toEqual(['a', 'c'])
    act(() => result.current.setQuery('LATER'))
    expect(ids(result.current.shownRows)).toEqual(['c'])
    act(() => result.current.setQuery('golan'))
    expect(ids(result.current.shownRows)).toEqual(['b'])
  })

  it('matches an existing #tag as a tag filter and flags isHashTagSearch', () => {
    const { result } = renderHook(() => useCollectionSearch(ROWS))
    act(() => result.current.setQuery('#rust'))
    // "Rust macros" has "rust" in its title but not the tag.
    expect(ids(result.current.shownRows)).toEqual(['a'])
    expect(result.current.isHashTagSearch).toBe(true)
  })

  it('matches an unknown #tag as plain text', () => {
    const rows = [...ROWS, makeRow('e', 5, { title: 'Notes on #nosuchtag', tags: [] })]
    const { result } = renderHook(() => useCollectionSearch(rows))
    act(() => result.current.setQuery('#nosuchtag'))
    expect(ids(result.current.shownRows)).toEqual(['e'])
    expect(result.current.isHashTagSearch).toBe(true)
  })

  it('keeps each shown row’s number in the full list', () => {
    const { result } = renderHook(() => useCollectionSearch(ROWS))
    act(() => result.current.setQuery('rust'))
    expect(result.current.shownRows.map(r => r.number)).toEqual([1, 3])
  })

  it('is not searching for a whitespace-only query', () => {
    const { result } = renderHook(() => useCollectionSearch(ROWS))
    act(() => result.current.setQuery('   '))
    expect(result.current.isSearching).toBe(false)
    expect(result.current.shownRows).toHaveLength(4)
  })

  it('re-filters when a link changes, and a status change never hides a row', () => {
    const { result } = renderHook(() => {
      const [rows, setRows] = useState(ROWS)
      return { setRows, ...useCollectionSearch(rows) }
    })
    act(() => result.current.setQuery('rust'))
    act(() => result.current.setRows(prev => prev.map(r => r.link.id === 'c' ? { ...r, link: { ...r.link, status: 'read' } } : r)))
    expect(ids(result.current.shownRows)).toEqual(['a', 'c'])
    act(() => result.current.setRows(prev => prev.map(r => r.link.id === 'c' ? { ...r, link: { ...r.link, title: 'Macros' } } : r)))
    expect(ids(result.current.shownRows)).toEqual(['a'])
  })

  it('clears the query when no visible rows are left', () => {
    const { result, rerender } = renderHook(({ rows }) => useCollectionSearch(rows), { initialProps: { rows: ROWS } })
    act(() => result.current.setQuery('rust'))
    rerender({ rows: [] })
    expect(result.current.query).toBe('')
    rerender({ rows: ROWS })
    expect(result.current.shownRows).toHaveLength(4)
  })

  it('clearSearch empties the query', () => {
    const { result } = renderHook(() => useCollectionSearch(ROWS))
    act(() => result.current.setQuery('rust'))
    act(() => result.current.clearSearch())
    expect(result.current.query).toBe('')
  })
})

describe('useCollectionSearch over useCollectionLinks', () => {
  const membership = (link_id: string, position: number) => ({ collection_id: 'c1', link_id, position, added_at: '2026-01-01T00:00:00Z' })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(UnlockedTagsProvider, null, children)

  it('never shows Trash or locked-private links, and re-filters on unlock', async () => {
    vi.mocked(getCollection).mockResolvedValue(COLLECTION)
    vi.mocked(getPrivateTagIdSet).mockResolvedValue(new Set(['p']))
    vi.mocked(getCollectionMemberships).mockResolvedValue([membership('a', 1), membership('b', 2), membership('c', 3)])
    vi.mocked(getLinksByIds).mockResolvedValue([
      makeLink('a', { title: 'Rust one' }),
      makeLink('b', { title: 'Rust trashed', deleted_at: '2026-02-01T00:00:00Z' }),
      makeLink('c', { title: 'Rust secret', tags: ['p'] }),
    ])
    const { result } = renderHook(() => {
      const data = useCollectionLinks('c1', {} as CryptoKey)
      return { data, search: useCollectionSearch(data.visibleRows), unlocked: useUnlockedTags() }
    }, { wrapper })
    await waitFor(() => expect(result.current.data.loading).toBe(false))

    act(() => result.current.search.setQuery('rust'))
    expect(ids(result.current.search.shownRows)).toEqual(['a'])

    act(() => result.current.unlocked.unlockTag('p'))
    expect(result.current.search.shownRows.map(r => `${r.number}:${r.link.id}`)).toEqual(['1:a', '2:c'])
  })
})
