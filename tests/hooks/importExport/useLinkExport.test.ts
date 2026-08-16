// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLinkExport } from '@/lib/hooks/importExport/useLinkExport'
import type { LinkWithTags } from '@/lib/services/links'

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}))

vi.mock('@/lib/services/links', () => ({
  getLinks: vi.fn(),
}))

vi.mock('@/lib/services/categories', () => ({
  getCategories: vi.fn(),
}))

const FAKE_DEK = {} as CryptoKey
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: FAKE_DEK, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({
    tags: [{ id: 'react', name: 'react', color: null, is_private: false, created_at: '', link_count: 0 }],
    loading: false,
    refetchTags: vi.fn(),
  }),
}))

import { getLinks } from '@/lib/services/links'
import { getCategories } from '@/lib/services/categories'
const mockGetLinks = vi.mocked(getLinks)
const mockGetCategories = vi.mocked(getCategories)

const MOCK_LINK: LinkWithTags = {
  id: '1', user_id: 'u1', url: 'https://example.com', title: 'Example',
  description: null, site_name: 'example.com', category_id: null,
  status: 'unread', is_favorite: false, notes: null, image_url: null, duration: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
  tags: ['react'],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetLinks.mockResolvedValue([MOCK_LINK])
  mockGetCategories.mockResolvedValue([])
  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    writable: true,
    configurable: true,
  })
  Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })
})

describe('useLinkExport', () => {
  it('calls getLinks when exporting as JSON', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('json') })

    expect(mockGetLinks).toHaveBeenCalledWith(FAKE_DEK)
  })

  it('calls getLinks when exporting as CSV', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('csv') })

    expect(mockGetLinks).toHaveBeenCalledWith(FAKE_DEK)
  })

  it('shows a success toast after JSON export', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('json') })

    expect(mockToastSuccess).toHaveBeenCalledWith('Exported 1 links as JSON')
  })

  it('shows a success toast after CSV export', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('csv') })

    expect(mockToastSuccess).toHaveBeenCalledWith('Exported 1 links as CSV')
  })

  it('triggers a download via URL.createObjectURL', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('json') })

    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
  })

  it('calls getCategories when exporting as CSV', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('csv') })

    expect(mockGetCategories).toHaveBeenCalledWith(FAKE_DEK)
  })

  it('does not call getCategories when exporting as JSON', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('json') })

    expect(mockGetCategories).not.toHaveBeenCalled()
  })

  it('clears exporting back to null after completion', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('json') })

    expect(result.current.exporting).toBeNull()
  })

  it('toasts an error when the export throws', async () => {
    mockGetLinks.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('json') })

    expect(mockToastError).toHaveBeenCalledWith('Export failed')
  })
})
