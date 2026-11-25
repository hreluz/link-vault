// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAddLinksToCollection } from '@/lib/hooks/collections/useAddLinksToCollection'
import { makeLink } from './fixtures'

vi.mock('@/lib/services/links', () => ({ getMatchingLinkIds: vi.fn(), getLinksByIds: vi.fn() }))
vi.mock('@/lib/services/collections', () => ({ getPrivateTagIdSet: vi.fn() }))
vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({
    tags: [
      { id: 't-rust', name: 'rust', is_private: false },
      { id: 't-p', name: 'secret', is_private: true },
    ],
    loading: false, refetchTags: vi.fn(),
  }),
}))
vi.mock('@/lib/hooks/tags/useTagNameLookup', () => ({
  useTagNameLookup: () => new Map([['t-rust', 'rust'], ['t-p', 'secret']]),
}))

import { getMatchingLinkIds, getLinksByIds } from '@/lib/services/links'
import { getPrivateTagIdSet, type CollectionMembership } from '@/lib/services/collections'
import type { LinkWithTags } from '@/lib/services/links'

type OnAdd = (links: LinkWithTags[]) => Promise<CollectionMembership[] | null>

const DEK = {} as CryptoKey
const CANDIDATES = [
  makeLink('old-async', { title: 'Old async', created_at: '2026-01-01T00:00:00Z', tags: ['t-rust'] }),
  makeLink('tagged', { title: 'Tagged only', created_at: '2026-01-02T00:00:00Z', tags: ['t-rust'] }),
  makeLink('new-async', { title: 'New async', created_at: '2026-01-03T00:00:00Z' }),
  makeLink('locked', { title: 'Async secret', created_at: '2026-01-04T00:00:00Z', tags: ['t-p'] }),
]

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.clearAllMocks()
  vi.mocked(getMatchingLinkIds).mockResolvedValue({ ids: CANDIDATES.map(l => l.id), totalCount: CANDIDATES.length })
  vi.mocked(getLinksByIds).mockResolvedValue(CANDIDATES)
  vi.mocked(getPrivateTagIdSet).mockResolvedValue(new Set(['t-p']))
})
afterEach(() => vi.useRealTimers())

async function setup(onAdd = vi.fn<OnAdd>(async () => [])) {
  const hook = renderHook(() => useAddLinksToCollection({ isOpen: true, dek: DEK, existingIds: new Set(['tagged']), onAdd }))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return { ...hook, onAdd }
}

async function search(result: { current: ReturnType<typeof useAddLinksToCollection> }, q: string) {
  act(() => result.current.setQuery(q))
  await act(async () => { vi.advanceTimersByTime(400) })
}

const ids = (links: { id: string }[]) => links.map(l => l.id)

describe('useAddLinksToCollection', () => {
  it('loads candidates with no structural filters', async () => {
    await setup()
    expect(getMatchingLinkIds).toHaveBeenCalledWith(expect.objectContaining({
      textSearch: '', categoryId: null, statuses: [], tagIds: [], favoritesOnly: false,
    }))
  })

  it('shows nothing until the user types', async () => {
    const { result } = await setup()
    expect(result.current.hasQuery).toBe(false)
    expect(result.current.results).toEqual([])
  })

  it('searches with the dashboard rule (a tag-name hit counts), newest first, skipping locked private links', async () => {
    const { result } = await setup()
    await search(result, 'rust')
    expect(ids(result.current.results)).toEqual(['tagged', 'old-async'])
    await search(result, 'async')
    expect(ids(result.current.results)).toEqual(['new-async', 'old-async'])
  })

  it('#tag filters by tag, and #tag plus text needs both', async () => {
    const { result } = await setup()
    await search(result, '#rust')
    expect(ids(result.current.results)).toEqual(['tagged', 'old-async'])
    await search(result, '#rust async')
    expect(ids(result.current.results)).toEqual(['old-async'])
    await search(result, '#nosuchtag')
    expect(result.current.results).toEqual([])
  })

  it('caps results at 50 and reports the total', async () => {
    const many = Array.from({ length: 60 }, (_, i) => makeLink(`m${i}`, { title: `Match ${i}` }))
    vi.mocked(getLinksByIds).mockResolvedValue(many)
    const { result } = await setup()
    await search(result, 'match')
    expect(result.current.results).toHaveLength(50)
    expect(result.current.totalMatches).toBe(60)
  })

  it('keeps ticks across queries and adds them in tick order; links already in are not tickable', async () => {
    const onAdd = vi.fn<OnAdd>(async () => [])
    const { result } = await setup(onAdd)
    await search(result, 'new')
    act(() => result.current.toggleTick('new-async'))
    await search(result, 'old')
    act(() => { result.current.toggleTick('old-async'); result.current.toggleTick('tagged') })
    expect(result.current.tickedIds).toEqual(['new-async', 'old-async'])
    let added: unknown = null
    await act(async () => { added = await result.current.submit() })
    expect(ids(onAdd.mock.calls[0][0])).toEqual(['new-async', 'old-async'])
    expect(ids(added as { id: string }[])).toEqual(['new-async', 'old-async'])
  })

  it('keeps the ticks when the add fails', async () => {
    const onAdd = vi.fn<OnAdd>(async () => null)
    const { result } = await setup(onAdd)
    act(() => result.current.toggleTick('new-async'))
    let added: unknown = 'x'
    await act(async () => { added = await result.current.submit() })
    expect(added).toBeNull()
    expect(result.current.tickedIds).toEqual(['new-async'])
  })

  it('reports a load error', async () => {
    vi.mocked(getMatchingLinkIds).mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => useAddLinksToCollection({ isOpen: true, dek: DEK, existingIds: new Set(), onAdd: vi.fn() }))
    await waitFor(() => expect(result.current.loadError).toBe(true))
  })
})
