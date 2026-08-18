// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLinkExport } from '@/lib/hooks/importExport/useLinkExport'
import type { ExportedLink } from '@/lib/types/importExport'

const { mockToastSuccess, mockToastError, mockToastWarning, mockBuildVaultExport, mockGetPrivateTagIds } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
  mockBuildVaultExport: vi.fn(),
  mockGetPrivateTagIds: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError, warning: mockToastWarning },
}))

vi.mock('@/lib/services/importExport/exportVault', () => ({
  buildVaultExport: mockBuildVaultExport,
}))

vi.mock('@/lib/services/tags/tags', () => ({
  getPrivateTagIds: mockGetPrivateTagIds,
}))

const FAKE_DEK = {} as CryptoKey
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: FAKE_DEK, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

let unlockedTagIds = new Set<string>()
vi.mock('@/lib/context/UnlockedTagsContext', () => ({
  useUnlockedTags: () => ({ unlockedTagIds, unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() }),
}))

const MOCK_LINK: ExportedLink = {
  url: 'https://example.com', title: 'Example',
  description: null, site_name: 'example.com', image_url: null, duration: null, notes: null,
  status: 'unread', is_favorite: false,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  category: null, tags: ['react'],
}

beforeEach(() => {
  vi.clearAllMocks()
  unlockedTagIds = new Set()
  mockGetPrivateTagIds.mockResolvedValue([])
  mockBuildVaultExport.mockResolvedValue({
    data: { format: 'link-vault-export', version: 2, exportedAt: '2026-01-01T00:00:00Z', mode: 'links', links: [MOCK_LINK] },
    hiddenPrivateLinksCount: 0,
  })
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
  it('calls buildVaultExport with the requested mode when exporting as JSON', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('links', 'json') })

    expect(mockBuildVaultExport).toHaveBeenCalledWith('links', FAKE_DEK, unlockedTagIds, new Set())
  })

  it('calls buildVaultExport with mode "everything"', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('everything', 'json') })

    expect(mockBuildVaultExport).toHaveBeenCalledWith('everything', FAKE_DEK, unlockedTagIds, new Set())
  })

  it('shows a success toast after JSON export', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('links', 'json') })

    expect(mockToastSuccess).toHaveBeenCalledWith('Exported 1 links as JSON')
  })

  it('shows a success toast after CSV export', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('links', 'csv') })

    expect(mockToastSuccess).toHaveBeenCalledWith('Exported 1 links as CSV')
  })

  it('triggers a download via URL.createObjectURL', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('links', 'json') })

    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
  })

  it('clears exporting back to null after completion', async () => {
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('links', 'json') })

    expect(result.current.exporting).toBeNull()
  })

  it('sets exporting to the in-flight mode/format while running', async () => {
    let resolveExport: (v: unknown) => void = () => {}
    mockBuildVaultExport.mockReturnValue(new Promise(resolve => { resolveExport = resolve }))
    const { result } = renderHook(() => useLinkExport())

    let exportPromise!: Promise<void>
    act(() => { exportPromise = result.current.handleExport('everything', 'json') })

    expect(result.current.exporting).toEqual({ mode: 'everything', format: 'json' })

    await act(async () => {
      resolveExport({ data: { links: [] }, hiddenPrivateLinksCount: 0 })
      await exportPromise
    })
  })

  it('toasts an error when the export throws', async () => {
    mockBuildVaultExport.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useLinkExport())

    await act(async () => { await result.current.handleExport('links', 'json') })

    expect(mockToastError).toHaveBeenCalledWith('Export failed')
  })

  describe('hasLockedPrivateTags', () => {
    it('is false when there are no private tags', async () => {
      mockGetPrivateTagIds.mockResolvedValue([])
      const { result } = renderHook(() => useLinkExport())

      await act(async () => {})

      expect(result.current.hasLockedPrivateTags).toBe(false)
    })

    it('is true when a private tag exists and is not unlocked', async () => {
      mockGetPrivateTagIds.mockResolvedValue(['secret-tag'])
      unlockedTagIds = new Set()
      const { result } = renderHook(() => useLinkExport())

      await act(async () => {})

      expect(result.current.hasLockedPrivateTags).toBe(true)
    })

    it('is false once the private tag is unlocked', async () => {
      mockGetPrivateTagIds.mockResolvedValue(['secret-tag'])
      unlockedTagIds = new Set(['secret-tag'])
      const { result } = renderHook(() => useLinkExport())

      await act(async () => {})

      expect(result.current.hasLockedPrivateTags).toBe(false)
    })
  })

  describe('locked private tag warning toast', () => {
    it('shows a warning toast when links were hidden behind locked private tags', async () => {
      mockBuildVaultExport.mockResolvedValue({
        data: { format: 'link-vault-export', version: 2, exportedAt: '', mode: 'links', links: [] },
        hiddenPrivateLinksCount: 2,
      })
      const { result } = renderHook(() => useLinkExport())

      await act(async () => { await result.current.handleExport('links', 'json') })

      expect(mockToastWarning).toHaveBeenCalledWith(expect.stringContaining('2 links behind locked private tags'))
    })

    it('does not show a warning toast when nothing was hidden', async () => {
      const { result } = renderHook(() => useLinkExport())

      await act(async () => { await result.current.handleExport('links', 'json') })

      expect(mockToastWarning).not.toHaveBeenCalled()
    })
  })
})
