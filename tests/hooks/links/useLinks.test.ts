// @vitest-environment jsdom

// Per-hook behavior is covered by useLinkListQuery/useLinkMutations/useLinkBulkMutations
// tests. Unlike categories/tags, useLinks has no open/close form coordination to test here --
// its three concerns instead share one piece of state (rawLinks/setRawLinks, owned by
// useLinkListQuery and threaded into the mutation hooks). This file only covers that wiring:
// behavior that's only observable once the hooks are composed together.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLinks } from '@/lib/hooks/links/useLinks'
import type { LinkWithTags, LinkFilterParams } from '@/lib/services/links'

const mockAddToast = vi.fn()
const mockDismissToast = vi.fn()
const FAKE_DEK = { fake: true } as unknown as CryptoKey

const { LINK_A, LINK_B, LINK_PRIVATE } = vi.hoisted(() => {
  const LINK_A: LinkWithTags = {
    id: '1', title: 'Alpha', site_name: 'alpha.com',
    status: 'unread', is_favorite: false, deleted_at: null, image_url: null, duration: null,
    tags: ['react'], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    url: 'https://alpha.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  const LINK_B: LinkWithTags = {
    id: '2', title: 'Beta', site_name: 'beta.com',
    status: 'read', is_favorite: true, deleted_at: null, image_url: null, duration: null,
    tags: ['vue'], created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    url: 'https://beta.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  const LINK_PRIVATE: LinkWithTags = {
    id: '3', title: 'Secret', site_name: 'secret.com',
    status: 'unread', is_favorite: false, deleted_at: null, image_url: null, duration: null,
    tags: ['private-stuff'], created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z',
    url: 'https://secret.com', description: '', notes: null, user_id: 'user-1', category_id: null,
  }
  return { LINK_A, LINK_B, LINK_PRIVATE }
})

const FILTER_PARAMS: LinkFilterParams = {
  textSearch: '', categoryId: null, statuses: [], tagIds: [], tagMode: 'any',
  favoritesOnly: false, sortBy: 'newest', unlockedTagIds: [],
}

vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast, dismissToast: mockDismissToast }),
}))

vi.mock('@/lib/services/links', () => ({
  getLinksPage: vi.fn(),
  getMatchingLinkIds: vi.fn(),
  getLinksByIds: vi.fn(),
  toggleLinkFavorite: vi.fn(),
  deleteLink: vi.fn(),
  bulkUpdateStatus: vi.fn(),
  bulkSoftDelete: vi.fn(),
  bulkUpdateCategory: vi.fn(),
  bulkAddTags: vi.fn(),
}))

vi.mock('@/lib/services/tags', () => ({
  getPrivateTagIds: vi.fn(),
  isTagVisible: (isPrivate: boolean, id: string, unlockedTagIds: Set<string>) =>
    !isPrivate || unlockedTagIds.has(id),
}))

const mockUseUnlockedTags = vi.fn()
vi.mock('@/lib/context/UnlockedTagsContext', () => ({
  useUnlockedTags: () => mockUseUnlockedTags(),
}))

vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: vi.fn() }),
}))

vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: FAKE_DEK, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

import { getLinksPage, bulkUpdateStatus } from '@/lib/services/links'
import { getPrivateTagIds } from '@/lib/services/tags'
const mockGetLinksPage = vi.mocked(getLinksPage)
const mockGetPrivateTagIds = vi.mocked(getPrivateTagIds)
const mockBulkUpdateStatus = vi.mocked(bulkUpdateStatus)

beforeEach(() => {
  vi.clearAllMocks()
  mockAddToast.mockReturnValue('toast-id')
  mockGetLinksPage.mockResolvedValue({ links: [LINK_A, LINK_B], totalCount: 2 })
  mockGetPrivateTagIds.mockResolvedValue([])
  mockBulkUpdateStatus.mockResolvedValue(true)
  mockUseUnlockedTags.mockReturnValue({ unlockedTagIds: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() })
})

async function renderLoaded(params: LinkFilterParams = FILTER_PARAMS) {
  const utils = renderHook(() => useLinks(params))
  await waitFor(() => expect(utils.result.current.loading).toBe(false))
  return utils
}

describe('useLinks composed wiring', () => {
  it('handleCreate then handleDelete round-trip through the shared list state', async () => {
    const { result } = await renderLoaded()
    const newLink = { ...LINK_A, id: '99', title: 'New' }

    act(() => result.current.handleCreate(newLink))
    expect(result.current.links.find(l => l.id === '99')).toBeDefined()

    act(() => result.current.handleDelete('99'))
    expect(result.current.links.find(l => l.id === '99')).toBeUndefined()
  })

  it('handleBulkStatusChange writes through to the composed links output', async () => {
    const { result } = await renderLoaded()

    await act(async () => { await result.current.handleBulkStatusChange(['1', '2'], 'archived') })

    expect(result.current.links.find(l => l.id === '1')?.status).toBe('archived')
    expect(result.current.links.find(l => l.id === '2')?.status).toBe('archived')
  })

  it('privacy filtering re-applies to a link added via handleCreate with a locked private tag', async () => {
    mockGetPrivateTagIds.mockResolvedValue(['private-stuff'])
    const { result } = await renderLoaded()

    act(() => result.current.handleCreate(LINK_PRIVATE))

    expect(result.current.links.find(l => l.id === '3')).toBeUndefined()
  })
})
