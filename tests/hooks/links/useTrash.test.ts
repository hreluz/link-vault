// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTrash } from '@/lib/hooks/links/useTrash'
import type { TrashedLink } from '@/lib/services/trash'

// ── fixtures ──────────────────────────────────────────────────────────────────

const { LINK_A, LINK_B } = vi.hoisted(() => {
  const base = {
    url: 'https://example.com', description: 'desc', notes: null,
    user_id: 'user-1', category_id: null, status: 'unread' as const,
    is_favorite: false, image_url: null, created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z', deleted_at: '2026-06-01T00:00:00Z',
  }
  const LINK_A: TrashedLink = { ...base, id: '1', title: 'Alpha Article', site_name: 'alpha.com', tags: ['react'] }
  const LINK_B: TrashedLink = { ...base, id: '2', title: 'Beta Post', site_name: 'beta.com', tags: ['vue'], description: 'Vue tutorial' }
  return { LINK_A, LINK_B }
})

// ── service mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/services/trash', () => ({
  getTrashedLinks: vi.fn(),
  restoreLink: vi.fn(),
  deleteLinkPermanently: vi.fn(),
  emptyTrash: vi.fn(),
}))

import { getTrashedLinks, restoreLink, deleteLinkPermanently, emptyTrash } from '@/lib/services/trash'
const mockGetTrashedLinks = vi.mocked(getTrashedLinks)
const mockRestoreLink = vi.mocked(restoreLink)
const mockDeleteLinkPermanently = vi.mocked(deleteLinkPermanently)
const mockEmptyTrash = vi.mocked(emptyTrash)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTrashedLinks.mockResolvedValue([LINK_A, LINK_B])
  mockRestoreLink.mockResolvedValue(true)
  mockDeleteLinkPermanently.mockResolvedValue(true)
  mockEmptyTrash.mockResolvedValue(true)
})

async function renderLoaded() {
  const utils = renderHook(() => useTrash())
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

// ── initial state ─────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts in loading state with no links', () => {
    const { result } = renderHook(() => useTrash())

    expect(result.current.loading).toBe(true)
    expect(result.current.links).toHaveLength(0)
  })

  it('loads trashed links and clears loading flag', async () => {
    const { result } = await renderLoaded()

    expect(result.current.loading).toBe(false)
    expect(result.current.links).toHaveLength(2)
  })

  it('exposes totalCount matching the loaded link count', async () => {
    const { result } = await renderLoaded()

    expect(result.current.totalCount).toBe(2)
  })

  it('starts with an empty search query', async () => {
    const { result } = await renderLoaded()

    expect(result.current.searchQuery).toBe('')
  })
})

// ── search / filtering ────────────────────────────────────────────────────────

describe('search', () => {
  it('returns all links when query is empty', async () => {
    const { result } = await renderLoaded()

    expect(result.current.links).toHaveLength(2)
  })

  it('filters by title (case-insensitive)', async () => {
    const { result } = await renderLoaded()

    act(() => result.current.setSearchQuery('alpha'))

    expect(result.current.links).toHaveLength(1)
    expect(result.current.links[0].id).toBe('1')
  })

  it('filters by description', async () => {
    const { result } = await renderLoaded()

    act(() => result.current.setSearchQuery('tutorial'))

    expect(result.current.links).toHaveLength(1)
    expect(result.current.links[0].id).toBe('2')
  })

  it('filters by site_name', async () => {
    const { result } = await renderLoaded()

    act(() => result.current.setSearchQuery('alpha.com'))

    expect(result.current.links).toHaveLength(1)
    expect(result.current.links[0].id).toBe('1')
  })

  it('filters by tag', async () => {
    const { result } = await renderLoaded()

    act(() => result.current.setSearchQuery('vue'))

    expect(result.current.links).toHaveLength(1)
    expect(result.current.links[0].id).toBe('2')
  })

  it('is case-insensitive', async () => {
    const { result } = await renderLoaded()

    act(() => result.current.setSearchQuery('ALPHA'))

    expect(result.current.links).toHaveLength(1)
  })

  it('returns empty array when query matches nothing', async () => {
    const { result } = await renderLoaded()

    act(() => result.current.setSearchQuery('zzznomatch'))

    expect(result.current.links).toHaveLength(0)
  })

  it('totalCount is unaffected by active search query', async () => {
    const { result } = await renderLoaded()

    act(() => result.current.setSearchQuery('alpha'))

    expect(result.current.totalCount).toBe(2)
  })
})

// ── handleRestore ─────────────────────────────────────────────────────────────

describe('handleRestore', () => {
  it('calls restoreLink with the correct id', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleRestore('1') })

    expect(mockRestoreLink).toHaveBeenCalledWith('1')
  })

  it('removes the link from state on success', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleRestore('1') })

    expect(result.current.links.find(l => l.id === '1')).toBeUndefined()
  })

  it('leaves other links intact after restore', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleRestore('1') })

    expect(result.current.links).toHaveLength(1)
    expect(result.current.links[0].id).toBe('2')
  })

  it('keeps the link in state when the service call fails', async () => {
    mockRestoreLink.mockResolvedValue(false)
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleRestore('1') })

    expect(result.current.links.find(l => l.id === '1')).toBeDefined()
  })

  it('decrements totalCount after a successful restore', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleRestore('1') })

    expect(result.current.totalCount).toBe(1)
  })
})

// ── handleDeletePermanently ───────────────────────────────────────────────────

describe('handleDeletePermanently', () => {
  it('calls deleteLinkPermanently with the correct id', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleDeletePermanently('2') })

    expect(mockDeleteLinkPermanently).toHaveBeenCalledWith('2')
  })

  it('removes the link from state on success', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleDeletePermanently('2') })

    expect(result.current.links.find(l => l.id === '2')).toBeUndefined()
  })

  it('leaves other links intact after permanent delete', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleDeletePermanently('2') })

    expect(result.current.links).toHaveLength(1)
    expect(result.current.links[0].id).toBe('1')
  })

  it('keeps the link in state when the service call fails', async () => {
    mockDeleteLinkPermanently.mockResolvedValue(false)
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleDeletePermanently('2') })

    expect(result.current.links.find(l => l.id === '2')).toBeDefined()
  })

  it('decrements totalCount after a successful permanent delete', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleDeletePermanently('1') })

    expect(result.current.totalCount).toBe(1)
  })
})

// ── handleEmptyTrash ──────────────────────────────────────────────────────────

describe('handleEmptyTrash', () => {
  it('calls emptyTrash', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleEmptyTrash() })

    expect(mockEmptyTrash).toHaveBeenCalledTimes(1)
  })

  it('clears all links from state on success', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleEmptyTrash() })

    expect(result.current.links).toHaveLength(0)
  })

  it('sets totalCount to 0 on success', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleEmptyTrash() })

    expect(result.current.totalCount).toBe(0)
  })

  it('keeps all links in state when the service call fails', async () => {
    mockEmptyTrash.mockResolvedValue(false)
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleEmptyTrash() })

    expect(result.current.links).toHaveLength(2)
  })

  it('does not change totalCount when the service call fails', async () => {
    mockEmptyTrash.mockResolvedValue(false)
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleEmptyTrash() })

    expect(result.current.totalCount).toBe(2)
  })
})
