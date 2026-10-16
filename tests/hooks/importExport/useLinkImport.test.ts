// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLinkImport } from '@/lib/hooks/importExport/useLinkImport'
import type { VaultExportV2 } from '@/lib/types/importExport'

const MOCK_CATEGORIES = [
  { id: 'cat-0', user_id: 'u1', name: 'Not defined', emoticon: '🔖', color: null, description: null, created_at: '', updated_at: '' },
  { id: 'cat-1', user_id: 'u1', name: 'YouTube', emoticon: '📺', color: null, description: null, created_at: '', updated_at: '' },
  { id: 'cat-2', user_id: 'u1', name: 'GitHub', emoticon: '💻', color: null, description: null, created_at: '', updated_at: '' },
]

const {
  mockImportLinks, mockUseCategoryList, mockGetOrCreateCategoryByName, mockImportVaultExport,
  mockToastSuccess, mockToastError, mockToastWarning, mockRefetchTags, mockFetchLinkMeta,
  mockGetCategoryIdByDomainMap,
} = vi.hoisted(() => ({
  mockImportLinks: vi.fn(),
  mockUseCategoryList: vi.fn(),
  mockGetOrCreateCategoryByName: vi.fn(),
  mockImportVaultExport: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
  mockRefetchTags: vi.fn(),
  mockFetchLinkMeta: vi.fn(),
  mockGetCategoryIdByDomainMap: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError, warning: mockToastWarning },
}))

vi.mock('@/lib/services/links', () => ({
  importLinks: mockImportLinks,
}))

vi.mock('@/lib/services/categories', () => ({
  getOrCreateCategoryByName: mockGetOrCreateCategoryByName,
  PROTECTED_CATEGORY_NAME: 'Not defined',
}))

// Only the DB read is mocked; matching uses the real lookup.
vi.mock('@/lib/services/category-domains', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/services/category-domains')>()),
  getCategoryIdByDomainMap: mockGetCategoryIdByDomainMap,
}))

vi.mock('@/lib/services/importExport/importVault', () => ({
  importVaultExport: mockImportVaultExport,
}))

vi.mock('@/app/dashboard/link/actions', () => ({
  fetchLinkMeta: mockFetchLinkMeta,
}))

vi.mock('@/lib/hooks/categories/useCategoryList', () => ({
  useCategoryList: mockUseCategoryList,
}))

const FAKE_DEK = {} as CryptoKey
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: FAKE_DEK, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({ tags: [], loading: false, refetchTags: mockRefetchTags }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCategoryList.mockReturnValue({ categories: MOCK_CATEGORIES, loading: false })
  mockImportLinks.mockResolvedValue({ imported: 2, skipped: 0, duplicates: 0 })
  mockGetOrCreateCategoryByName.mockResolvedValue('cat-resolved')
  mockGetCategoryIdByDomainMap.mockResolvedValue(new Map())
  mockImportVaultExport.mockResolvedValue({
    imported: 2, skipped: 0, duplicates: 0, categoriesCreated: 0, domainsCreated: 0, tagsCreated: 0,
  })
})

function fileChangeEvent(file: File) {
  return { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
}

async function renderWithDefaultCategory() {
  const utils = renderHook(() => useLinkImport())
  await waitFor(() => expect(utils.result.current.defaultCategoryId).toBe('cat-0'))
  return utils
}

const VAULT_EXPORT: VaultExportV2 = {
  format: 'link-vault-export',
  version: 2,
  exportedAt: '2026-01-01T00:00:00Z',
  mode: 'everything',
  links: [{
    url: 'https://example.com', title: 'Example', description: null, site_name: 'example.com',
    image_url: null, duration: null, notes: null, status: 'unread', is_favorite: false,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', category: null, tags: [],
  }],
  categories: [{ name: 'Article', description: null, color: '#3B82F6', emoticon: '📄' }],
  tags: [{ name: 'react', color: '#61dafb', is_private: false }],
  preferences: {
    theme_mode: 'dark', accent_color_light: 'indigo', accent_color_dark: 'violet',
    surface_family: 'slate', auto_fetch_enabled: true,
  },
}

describe('useLinkImport', () => {
  describe('default category', () => {
    it('exposes categories from useCategoryList', () => {
      const { result } = renderHook(() => useLinkImport())
      expect(result.current.categories).toEqual(MOCK_CATEGORIES)
    })

    it('auto-selects the "Not defined" category once categories load', async () => {
      const { result } = await renderWithDefaultCategory()
      expect(result.current.defaultCategoryId).toBe('cat-0')
    })

    it('passes the selected category to importLinks', async () => {
      const { result } = await renderWithDefaultCategory()

      act(() => {
        result.current.setUrlsText('https://example.com')
        result.current.setDefaultCategoryId('cat-2')
      })
      await act(async () => { await result.current.handleImport() })

      expect(mockImportLinks).toHaveBeenCalledWith(expect.any(Array), 'cat-2', FAKE_DEK, { onProgress: expect.any(Function), fetchMeta: undefined, signal: expect.any(AbortSignal) })
    })
  })

  describe('switchTab', () => {
    it('changes importTab', () => {
      const { result } = renderHook(() => useLinkImport())

      act(() => result.current.switchTab('json'))

      expect(result.current.importTab).toBe('json')
    })

    it('resets lastResult', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))
      await act(async () => { await result.current.handleImport() })
      expect(result.current.lastResult).not.toBeNull()

      act(() => result.current.switchTab('json'))

      expect(result.current.lastResult).toBeNull()
    })
  })

  describe('hasImportContent', () => {
    it('is false with an empty URLs textarea', () => {
      const { result } = renderHook(() => useLinkImport())
      expect(result.current.hasImportContent).toBe(false)
    })

    it('is true once URLs text is entered', () => {
      const { result } = renderHook(() => useLinkImport())
      act(() => result.current.setUrlsText('https://example.com'))
      expect(result.current.hasImportContent).toBe(true)
    })

    it('is true once JSON text is entered on the json tab', () => {
      const { result } = renderHook(() => useLinkImport())
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText('[{"url":"https://example.com"}]'))
      expect(result.current.hasImportContent).toBe(true)
    })

    it('is true once a file is selected on the file tab', () => {
      const { result } = renderHook(() => useLinkImport())
      act(() => result.current.switchTab('file'))
      const file = new File(['[]'], 'links.json', { type: 'application/json' })
      act(() => result.current.handleFileChange(fileChangeEvent(file)))
      expect(result.current.hasImportContent).toBe(true)
    })
  })

  describe('URLs import', () => {
    it('calls importLinks with one entry per non-blank line', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com\nhttps://github.com\n  \n'))

      await act(async () => { await result.current.handleImport() })

      expect(mockImportLinks).toHaveBeenCalledWith(
        [{ url: 'https://example.com', tags: [] }, { url: 'https://github.com', tags: [] }],
        'cat-0',
        FAKE_DEK,
        { onProgress: expect.any(Function), fetchMeta: undefined, signal: expect.any(AbortSignal) },
      )
    })

    it('trims whitespace from each URL', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('  https://example.com  '))

      await act(async () => { await result.current.handleImport() })

      expect(mockImportLinks).toHaveBeenCalledWith(
        [{ url: 'https://example.com', tags: [] }],
        expect.anything(),
        FAKE_DEK,
        { onProgress: expect.any(Function), fetchMeta: undefined, signal: expect.any(AbortSignal) },
      )
    })

    it('finishes in the modal without a success toast', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      await act(async () => { await result.current.handleImport() })

      expect(result.current.importModalState).toBe('finished')
      expect(mockToastSuccess).not.toHaveBeenCalled()
    })

    it('finishes in the modal without a warning toast when nothing is imported', async () => {
      mockImportLinks.mockResolvedValue({ imported: 0, skipped: 2, duplicates: 1, failures: [] })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      await act(async () => { await result.current.handleImport() })

      expect(result.current.importModalState).toBe('finished')
      expect(mockToastWarning).not.toHaveBeenCalled()
    })

    it('sets lastResult after a successful import', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      await act(async () => { await result.current.handleImport() })

      expect(result.current.lastResult).toEqual({ imported: 2, skipped: 0, duplicates: 0 })
    })

    it('clears the URLs text after a successful import', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      await act(async () => { await result.current.handleImport() })

      expect(result.current.urlsText).toBe('')
    })

    it('refetches the shared tags cache on a successful import', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      await act(async () => { await result.current.handleImport() })

      expect(mockRefetchTags).toHaveBeenCalledOnce()
    })

  })

  describe('JSON import', () => {
    async function renderOnJsonTab() {
      const utils = await renderWithDefaultCategory()
      act(() => utils.result.current.switchTab('json'))
      return utils
    }

    it('calls importLinks with parsed JSON entries', async () => {
      const { result } = await renderOnJsonTab()
      act(() => result.current.setJsonText('[{"url":"https://example.com","tags":["react"]}]'))

      await act(async () => { await result.current.handleImport() })

      expect(mockImportLinks).toHaveBeenCalledWith(
        [{ url: 'https://example.com', tags: ['react'] }],
        expect.anything(),
        FAKE_DEK,
        { onProgress: expect.any(Function), fetchMeta: undefined, signal: expect.any(AbortSignal) },
      )
    })

    it('shows an error toast for malformed JSON', async () => {
      const { result } = await renderOnJsonTab()
      act(() => result.current.setJsonText('not json at all'))

      await act(async () => { await result.current.handleImport() })

      expect(mockToastError).toHaveBeenCalledWith('Invalid JSON')
    })

    it('shows an error toast when JSON is not an array', async () => {
      const { result } = await renderOnJsonTab()
      act(() => result.current.setJsonText('{"url":"https://example.com"}'))

      await act(async () => { await result.current.handleImport() })

      expect(mockToastError).toHaveBeenCalledWith('JSON must be an array')
    })

    it('filters out entries whose url is not a string', async () => {
      const { result } = await renderOnJsonTab()
      act(() => result.current.setJsonText('[{"url":"https://example.com"},{"url":123}]'))

      await act(async () => { await result.current.handleImport() })

      expect(mockImportLinks).toHaveBeenCalledWith(
        [{ url: 'https://example.com' }],
        expect.anything(),
        FAKE_DEK,
        { onProgress: expect.any(Function), fetchMeta: undefined, signal: expect.any(AbortSignal) },
      )
    })
  })

  describe('file import', () => {
    it('sets selectedFile from handleFileChange', () => {
      const { result } = renderHook(() => useLinkImport())
      const file = new File(['[]'], 'links.json', { type: 'application/json' })

      act(() => result.current.handleFileChange(fileChangeEvent(file)))

      expect(result.current.selectedFile).toBe(file)
    })

    it('calls importLinks with parsed JSON from the uploaded file', async () => {
      const { result } = await renderWithDefaultCategory()
      const file = new File(
        ['[{"url":"https://example.com","tags":["test"]}]'],
        'links.json',
        { type: 'application/json' },
      )
      act(() => result.current.switchTab('file'))
      act(() => result.current.handleFileChange(fileChangeEvent(file)))

      await act(async () => { await result.current.handleImport() })

      expect(mockImportLinks).toHaveBeenCalledWith(
        [{ url: 'https://example.com', tags: ['test'] }],
        expect.anything(),
        FAKE_DEK,
        { onProgress: expect.any(Function), fetchMeta: undefined, signal: expect.any(AbortSignal) },
      )
    })

    it('sets isDragging on drag-over and clears it on drag-leave', () => {
      const { result } = renderHook(() => useLinkImport())
      const dragEvent = { preventDefault: () => {} } as React.DragEvent

      act(() => result.current.handleDragOver(dragEvent))
      expect(result.current.isDragging).toBe(true)

      act(() => result.current.handleDragLeave())
      expect(result.current.isDragging).toBe(false)
    })

    it('sets selectedFile and clears isDragging on drop', () => {
      const { result } = renderHook(() => useLinkImport())
      const file = new File(['[]'], 'links.json', { type: 'application/json' })
      const dropEvent = { preventDefault: () => {}, dataTransfer: { files: [file] } } as unknown as React.DragEvent

      act(() => result.current.handleDrop(dropEvent))

      expect(result.current.selectedFile).toBe(file)
      expect(result.current.isDragging).toBe(false)
    })
  })

  describe('CSV file import', () => {
    const CSV = [
      'url,title,description,site_name,image_url,duration,category,status,is_favorite,notes,tags,created_at,updated_at',
      'https://example.com,,,example.com,,,Article,unread,false,,react,2026-01-01,2026-01-01',
    ].join('\n')

    it('resolves category name to an id via getOrCreateCategoryByName', async () => {
      const { result } = await renderWithDefaultCategory()
      const file = new File([CSV], 'links.csv', { type: 'text/csv' })
      act(() => result.current.switchTab('file'))
      act(() => result.current.handleFileChange(fileChangeEvent(file)))

      await act(async () => { await result.current.handleImport() })

      expect(mockGetOrCreateCategoryByName).toHaveBeenCalledWith('Article', FAKE_DEK)
    })

    it('passes the resolved category_id to importLinks', async () => {
      const { result } = await renderWithDefaultCategory()
      const file = new File([CSV], 'links.csv', { type: 'text/csv' })
      act(() => result.current.switchTab('file'))
      act(() => result.current.handleFileChange(fileChangeEvent(file)))

      await act(async () => { await result.current.handleImport() })

      expect(mockImportLinks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ url: 'https://example.com', category_id: 'cat-resolved' }),
        ]),
        expect.anything(),
        FAKE_DEK,
        { onProgress: expect.any(Function), fetchMeta: undefined, signal: expect.any(AbortSignal) },
      )
    })

    it('sets category_id to null when the category column is blank', async () => {
      const csvNoCategory = [
        'url,title,description,site_name,image_url,duration,category,status,is_favorite,notes,tags,created_at,updated_at',
        'https://example.com,,,,,,,,false,,,2026-01-01,2026-01-01',
      ].join('\n')
      const { result } = await renderWithDefaultCategory()
      const file = new File([csvNoCategory], 'links.csv', { type: 'text/csv' })
      act(() => result.current.switchTab('file'))
      act(() => result.current.handleFileChange(fileChangeEvent(file)))

      await act(async () => { await result.current.handleImport() })

      expect(mockImportLinks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ url: 'https://example.com', category_id: null }),
        ]),
        expect.anything(),
        FAKE_DEK,
        { onProgress: expect.any(Function), fetchMeta: undefined, signal: expect.any(AbortSignal) },
      )
      expect(mockGetOrCreateCategoryByName).not.toHaveBeenCalled()
    })
  })

  describe('domain auto-assign', () => {
    const CSV_HEADER = 'url,title,description,site_name,image_url,duration,category,status,is_favorite,notes,tags,created_at,updated_at'
    const DOMAIN_MAP = new Map([['youtube.com', 'cat-1'], ['github.com', 'cat-2']])

    beforeEach(() => {
      mockGetCategoryIdByDomainMap.mockResolvedValue(DOMAIN_MAP)
    })

    function importedInputs() {
      return mockImportLinks.mock.calls[0][0]
    }

    async function importCsv(csv: string) {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('file'))
      act(() => result.current.handleFileChange(fileChangeEvent(new File([csv], 'links.csv', { type: 'text/csv' }))))
      await act(async () => { await result.current.handleImport() })
    }

    it('gives pasted URLs with a mapped domain the rule\'s category, leaving unmapped ones without one', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://www.youtube.com/watch?v=x\nhttps://example.com/a'))

      await act(async () => { await result.current.handleImport() })

      expect(importedInputs()).toEqual([
        { url: 'https://www.youtube.com/watch?v=x', tags: [], category_id: 'cat-1' },
        { url: 'https://example.com/a', tags: [] },
      ])
      expect(mockImportLinks.mock.calls[0][1]).toBe('cat-0')
    })

    it('keeps a CSV row\'s explicit category even when its domain is mapped', async () => {
      await importCsv([CSV_HEADER, 'https://github.com/a/b,,,,,,Course,unread,false,,,2026-01-01,2026-01-01'].join('\n'))

      expect(importedInputs()).toEqual([
        expect.objectContaining({ url: 'https://github.com/a/b', category_id: 'cat-resolved' }),
      ])
    })

    it('gives a CSV row with a blank category its domain rule', async () => {
      await importCsv([CSV_HEADER, 'https://github.com/a/b,,,,,,,,false,,,2026-01-01,2026-01-01'].join('\n'))

      expect(importedInputs()).toEqual([
        expect.objectContaining({ url: 'https://github.com/a/b', category_id: 'cat-2' }),
      ])
    })

    it('keeps a pasted JSON row\'s own category_id, and fills one in for a row without it', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify([
        { url: 'https://youtube.com/watch?v=x', category_id: 'cat-own' },
        { url: 'https://youtube.com/watch?v=y' },
      ])))

      await act(async () => { await result.current.handleImport() })

      expect(importedInputs()).toEqual([
        { url: 'https://youtube.com/watch?v=x', category_id: 'cat-own' },
        { url: 'https://youtube.com/watch?v=y', category_id: 'cat-1' },
      ])
    })

    it('applies domain rules to a plain JSON upload too', async () => {
      const { result } = await renderWithDefaultCategory()
      const file = new File([JSON.stringify([{ url: 'https://github.com/a/b' }])], 'links.json', { type: 'application/json' })
      act(() => result.current.switchTab('file'))
      act(() => result.current.handleFileChange(fileChangeEvent(file)))

      await act(async () => { await result.current.handleImport() })

      expect(importedInputs()).toEqual([{ url: 'https://github.com/a/b', category_id: 'cat-2' }])
    })

    it('loads the domain rules once per import, regardless of row count', async () => {
      const { result } = await renderWithDefaultCategory()
      const urls = Array.from({ length: 200 }, (_, i) => `https://youtube.com/watch?v=${i}`)
      act(() => result.current.setUrlsText(urls.join('\n')))

      await act(async () => { await result.current.handleImport() })

      expect(mockGetCategoryIdByDomainMap).toHaveBeenCalledTimes(1)
      expect(mockGetCategoryIdByDomainMap).toHaveBeenCalledWith(FAKE_DEK)
      expect(importedInputs()).toHaveLength(200)
    })

    it('still imports the original inputs when loading the rules fails', async () => {
      mockGetCategoryIdByDomainMap.mockRejectedValue(new Error('boom'))
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://youtube.com/watch?v=x'))

      await act(async () => { await result.current.handleImport() })

      expect(importedInputs()).toEqual([{ url: 'https://youtube.com/watch?v=x', tags: [] }])
      expect(result.current.importModalState).toBe('finished')
    })

    it('never loads the domain rules for a v2 import', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))

      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())
      await act(async () => { await result.current.handleImport() })

      expect(mockImportVaultExport).toHaveBeenCalled()
      expect(mockGetCategoryIdByDomainMap).not.toHaveBeenCalled()
    })
  })

  describe('full-vault (v2) import', () => {
    it('detects a v2 export pasted into the JSON tab and does not fall back to importLinks', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))

      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())
      await act(async () => { await result.current.handleImport() })

      expect(mockImportVaultExport).toHaveBeenCalledWith(
        VAULT_EXPORT,
        { defaultCategoryId: 'cat-0', applyPreferences: true, onProgress: expect.any(Function), signal: expect.any(AbortSignal) },
        FAKE_DEK,
      )
      expect(mockImportLinks).not.toHaveBeenCalled()
    })

    it('detects a v2 export uploaded as a .json file', async () => {
      const { result } = await renderWithDefaultCategory()
      const file = new File([JSON.stringify(VAULT_EXPORT)], 'vault.json', { type: 'application/json' })
      act(() => result.current.switchTab('file'))
      act(() => result.current.handleFileChange(fileChangeEvent(file)))

      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())
      await act(async () => { await result.current.handleImport() })

      expect(mockImportVaultExport).toHaveBeenCalledWith(
        VAULT_EXPORT,
        { defaultCategoryId: 'cat-0', applyPreferences: true, onProgress: expect.any(Function), signal: expect.any(AbortSignal) },
        FAKE_DEK,
      )
    })

    it('does not detect a v2 export from a legacy bare-array JSON payload', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText('[{"url":"https://example.com"}]'))

      await waitFor(() => expect(mockImportLinks).not.toHaveBeenCalled)
      expect(result.current.detectedVaultExport).toBeNull()
    })

    it('respects applyPreferences when set to false', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      act(() => result.current.setApplyPreferences(false))
      await act(async () => { await result.current.handleImport() })

      expect(mockImportVaultExport).toHaveBeenCalledWith(
        VAULT_EXPORT,
        { defaultCategoryId: 'cat-0', applyPreferences: false, onProgress: expect.any(Function), signal: expect.any(AbortSignal) },
        FAKE_DEK,
      )
    })

    it('opens the modal as a vault run and finishes without a toast', async () => {
      mockImportVaultExport.mockResolvedValue({
        imported: 0, skipped: 0, duplicates: 1, categoriesCreated: 1, domainsCreated: 0, tagsCreated: 1,
      })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      await act(async () => { await result.current.handleImport() })

      expect(result.current.importRun).toEqual({ isVault: true, withMetadata: false })
      expect(result.current.importModalState).toBe('finished')
      expect(mockToastSuccess).not.toHaveBeenCalled()
      expect(mockToastWarning).not.toHaveBeenCalled()
    })

    it('sets lastResult with the extended vault-import counts', async () => {
      mockImportVaultExport.mockResolvedValue({
        imported: 1, skipped: 0, duplicates: 0, categoriesCreated: 2, domainsCreated: 1, tagsCreated: 3,
      })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      await act(async () => { await result.current.handleImport() })

      expect(result.current.lastResult).toEqual({
        imported: 1, skipped: 0, duplicates: 0, categoriesCreated: 2, domainsCreated: 1, tagsCreated: 3,
      })
    })

    it('clears the JSON text and selected file after a successful v2 import', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      await act(async () => { await result.current.handleImport() })

      expect(result.current.jsonText).toBe('')
    })

    it('sets vaultExportError and leaves detectedVaultExport null for a structurally-invalid v2 file', async () => {
      const invalid = { ...VAULT_EXPORT, categories: 'oops' }
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(invalid)))

      await waitFor(() => expect(result.current.vaultExportError).not.toBeNull())
      expect(result.current.detectedVaultExport).toBeNull()
    })

    it('shows the validation error toast and never calls importVaultExport for an invalid v2 file', async () => {
      const invalid = { ...VAULT_EXPORT, categories: 'oops' }
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(invalid)))
      await waitFor(() => expect(result.current.vaultExportError).not.toBeNull())

      await act(async () => { await result.current.handleImport() })

      expect(mockToastError).toHaveBeenCalledWith(result.current.vaultExportError)
      expect(mockImportVaultExport).not.toHaveBeenCalled()
    })

    it('clears a stale vaultExportError once the text is fixed into a valid v2 export', async () => {
      const invalid = { ...VAULT_EXPORT, categories: 'oops' }
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(invalid)))
      await waitFor(() => expect(result.current.vaultExportError).not.toBeNull())

      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))

      await waitFor(() => expect(result.current.vaultExportError).toBeNull())
      expect(result.current.detectedVaultExport).not.toBeNull()
    })

    it('shows a thrown error\'s message in the modal\'s error state instead of a toast', async () => {
      mockImportVaultExport.mockRejectedValue(new Error('boom: something specific went wrong'))
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      await act(async () => { await result.current.handleImport() })

      expect(result.current.importModalState).toBe('error')
      expect(result.current.importError).toBe('boom: something specific went wrong')
      expect(mockToastError).not.toHaveBeenCalled()
    })
  })

  describe('auto-fetch on import', () => {
    it('defaults to off and passes no fetcher to importLinks', async () => {
      const { result } = await renderWithDefaultCategory()
      expect(result.current.autoFetchOnImport).toBe(false)

      act(() => result.current.setUrlsText('https://example.com'))
      await act(async () => { await result.current.handleImport() })

      expect(mockImportLinks).toHaveBeenCalledWith(
        expect.any(Array), 'cat-0', FAKE_DEK, { onProgress: expect.any(Function), fetchMeta: undefined, signal: expect.any(AbortSignal) },
      )
    })

    it('passes fetchLinkMeta to importLinks when turned on', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setAutoFetchOnImport(true))
      expect(result.current.autoFetchOnImport).toBe(true)

      act(() => result.current.setUrlsText('https://example.com'))
      await act(async () => { await result.current.handleImport() })

      expect(mockImportLinks).toHaveBeenCalledWith(
        expect.any(Array), 'cat-0', FAKE_DEK, { onProgress: expect.any(Function), fetchMeta: mockFetchLinkMeta, signal: expect.any(AbortSignal) },
      )
    })

    it('never fetches for a detected v2 export, even when turned on', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setAutoFetchOnImport(true))
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))

      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())
      await act(async () => { await result.current.handleImport() })

      expect(mockImportVaultExport).toHaveBeenCalled()
      expect(mockImportLinks).not.toHaveBeenCalled()
      expect(mockFetchLinkMeta).not.toHaveBeenCalled()
    })

    it('carries metaMissing from importLinks into lastResult', async () => {
      mockImportLinks.mockResolvedValue({ imported: 2, skipped: 0, duplicates: 0, metaMissing: 1 })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setAutoFetchOnImport(true))

      act(() => result.current.setUrlsText('https://a.com\nhttps://b.com'))
      await act(async () => { await result.current.handleImport() })

      expect(result.current.lastResult?.metaMissing).toBe(1)
    })
  })

  describe('progress', () => {
    it('updates progress while importVaultExport is in flight, then clears it on completion', async () => {
      let resolveImport: (v: unknown) => void = () => {}
      mockImportVaultExport.mockImplementation((_data: unknown, options: { onProgress?: (p: unknown) => void }) => {
        options.onProgress?.({ phase: 'categories', done: 1, total: 3 })
        return new Promise(resolve => { resolveImport = resolve })
      })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      let importPromise!: Promise<void>
      act(() => { importPromise = result.current.handleImport() })

      await waitFor(() => expect(result.current.progress).toEqual({ phase: 'categories', done: 1, total: 3 }))

      await act(async () => {
        resolveImport({ imported: 1, skipped: 0, duplicates: 0, categoriesCreated: 0, domainsCreated: 0, tagsCreated: 0 })
        await importPromise
      })

      expect(result.current.progress).toBeNull()
    })

    it('clears progress after a failed import too', async () => {
      mockImportVaultExport.mockImplementation((_data: unknown, options: { onProgress?: (p: unknown) => void }) => {
        options.onProgress?.({ phase: 'categories', done: 1, total: 1 })
        return Promise.reject(new Error('boom'))
      })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      await act(async () => { await result.current.handleImport() })

      expect(result.current.progress).toBeNull()
    })

    it('updates progress via the legacy importLinks path for a plain URL paste', async () => {
      let resolveImport: (v: unknown) => void = () => {}
      mockImportLinks.mockImplementation((
        _inputs: unknown, _cat: unknown, _dek: unknown, { onProgress }: { onProgress?: (done: number, total: number) => void } = {},
      ) => {
        onProgress?.(1, 1)
        return new Promise(resolve => { resolveImport = resolve })
      })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      let importPromise!: Promise<void>
      act(() => { importPromise = result.current.handleImport() })

      await waitFor(() => expect(result.current.progress).toEqual({ phase: 'links', done: 1, total: 1 }))

      await act(async () => {
        resolveImport({ imported: 1, skipped: 0, duplicates: 0 })
        await importPromise
      })
    })
  })
  describe('import modal', () => {
    type Outcome = Record<string, unknown>
    function emitOutcomes(outcomes: Outcome[]) {
      mockImportLinks.mockImplementation(async (
        _inputs: unknown, _cat: unknown, _dek: unknown,
        { onProgress }: { onProgress?: (done: number, total: number, outcome: Outcome) => void } = {},
      ) => {
        outcomes.forEach((outcome, i) => onProgress?.(i + 1, outcomes.length, outcome))
        return { imported: 0, skipped: 0, duplicates: 0, failures: [] }
      })
    }

    it('starts closed', () => {
      const { result } = renderHook(() => useLinkImport())
      expect(result.current.importModalState).toBe('closed')
    })

    it('accumulates stats from each row outcome', async () => {
      emitOutcomes([
        { url: 'https://a.com', status: 'imported', metaMissing: false },
        { url: 'https://b.com', status: 'imported', metaMissing: true },
        { url: 'https://dup.com', status: 'duplicate' },
        { url: 'bad', status: 'failed', reason: 'invalid_url' },
        { url: 'https://c.com', status: 'failed', reason: 'save_error' },
      ])
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://a.com'))

      await act(async () => { await result.current.handleImport() })

      expect(result.current.importStats).toEqual({
        imported: 2, duplicates: 1, failed: 2, metaMissing: 1,
        failures: [
          { url: 'bad', reason: 'invalid_url' },
          { url: 'https://c.com', reason: 'save_error' },
        ],
      })
    })

    it('accumulates stats from outcomes on vault-import links progress events', async () => {
      mockImportVaultExport.mockImplementation(async (_data: unknown, options: { onProgress?: (p: unknown) => void }) => {
        options.onProgress?.({ phase: 'categories', done: 1, total: 1 })
        options.onProgress?.({ phase: 'links', done: 1, total: 1, outcome: { url: 'x', status: 'failed', reason: 'invalid_url' } })
        return { imported: 0, skipped: 1, duplicates: 0, categoriesCreated: 0, domainsCreated: 0, tagsCreated: 0 }
      })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      await act(async () => { await result.current.handleImport() })

      expect(result.current.importStats.failed).toBe(1)
      expect(result.current.importStats.failures).toEqual([{ url: 'x', reason: 'invalid_url' }])
    })

    it('resets stats at the start of each import', async () => {
      emitOutcomes([{ url: 'https://a.com', status: 'imported', metaMissing: false }])
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://a.com'))
      await act(async () => { await result.current.handleImport() })
      act(() => result.current.closeImportModal())

      act(() => result.current.setUrlsText('https://a.com'))
      await act(async () => { await result.current.handleImport() })

      expect(result.current.importStats.imported).toBe(1)
    })

    it('goes closed -> running -> finished', async () => {
      let resolveImport: (v: unknown) => void = () => {}
      mockImportLinks.mockImplementation(() => new Promise(resolve => { resolveImport = resolve }))
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://a.com'))

      let importPromise!: Promise<void>
      act(() => { importPromise = result.current.handleImport() })
      await waitFor(() => expect(result.current.importModalState).toBe('running'))

      await act(async () => {
        resolveImport({ imported: 1, skipped: 0, duplicates: 0, failures: [] })
        await importPromise
      })

      expect(result.current.importModalState).toBe('finished')
    })

    it('goes to error with the message when importLinks throws', async () => {
      mockImportLinks.mockRejectedValue(new Error('network down'))
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://a.com'))

      await act(async () => { await result.current.handleImport() })

      expect(result.current.importModalState).toBe('error')
      expect(result.current.importError).toBe('network down')
    })

    it('ignores closeImportModal while running, then closes once finished', async () => {
      let resolveImport: (v: unknown) => void = () => {}
      mockImportLinks.mockImplementation(() => new Promise(resolve => { resolveImport = resolve }))
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://a.com'))

      let importPromise!: Promise<void>
      act(() => { importPromise = result.current.handleImport() })
      await waitFor(() => expect(result.current.importModalState).toBe('running'))

      act(() => result.current.closeImportModal())
      expect(result.current.importModalState).toBe('running')

      await act(async () => {
        resolveImport({ imported: 1, skipped: 0, duplicates: 0, failures: [] })
        await importPromise
      })
      act(() => result.current.closeImportModal())

      expect(result.current.importModalState).toBe('closed')
    })

    it('keeps the modal closed for a pre-flight error (Invalid JSON)', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText('{not json'))

      await act(async () => { await result.current.handleImport() })

      expect(mockToastError).toHaveBeenCalledWith('Invalid JSON')
      expect(result.current.importModalState).toBe('closed')
    })

    it('keeps the modal closed when no valid links are found', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText('[]'))

      await act(async () => { await result.current.handleImport() })

      expect(mockToastError).toHaveBeenCalledWith('No valid links found')
      expect(result.current.importModalState).toBe('closed')
    })

    it('opens the modal before CSV categories are created', async () => {
      let resolveCategory: (id: string) => void = () => {}
      mockGetOrCreateCategoryByName.mockImplementation(() => new Promise(resolve => { resolveCategory = resolve }))
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('file'))
      const file = new File(['url,category\nhttps://a.com,Article'], 'links.csv', { type: 'text/csv' })
      act(() => result.current.handleFileChange(fileChangeEvent(file)))

      let importPromise!: Promise<void>
      act(() => { importPromise = result.current.handleImport() })
      await waitFor(() => expect(mockGetOrCreateCategoryByName).toHaveBeenCalled())

      expect(result.current.importModalState).toBe('running')
      expect(mockImportLinks).not.toHaveBeenCalled()

      await act(async () => {
        resolveCategory('cat-resolved')
        await importPromise
      })
      expect(result.current.importModalState).toBe('finished')
    })

    it('records whether metadata is fetched for this run', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setAutoFetchOnImport(true))
      act(() => result.current.setUrlsText('https://a.com'))

      await act(async () => { await result.current.handleImport() })

      expect(result.current.importRun).toEqual({ isVault: false, withMetadata: true })
    })

    it('registers a beforeunload warning only while importing', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      let resolveImport: (v: unknown) => void = () => {}
      mockImportLinks.mockImplementation(() => new Promise(resolve => { resolveImport = resolve }))
      const { result } = await renderWithDefaultCategory()
      expect(addSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function))
      act(() => result.current.setUrlsText('https://a.com'))

      let importPromise!: Promise<void>
      act(() => { importPromise = result.current.handleImport() })
      await waitFor(() => expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function)))

      await act(async () => {
        resolveImport({ imported: 1, skipped: 0, duplicates: 0, failures: [] })
        await importPromise
      })

      expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
      addSpy.mockRestore()
      removeSpy.mockRestore()
    })
  })

  describe('cancel', () => {
    /** Starts a URL import whose importLinks call stays pending; exposes its signal and a resolver. */
    async function startPendingImport() {
      let resolveImport: (v: unknown) => void = () => {}
      let signal: AbortSignal | undefined
      mockImportLinks.mockImplementation((
        _inputs: unknown, _cat: unknown, _dek: unknown, options: { signal?: AbortSignal } = {},
      ) => {
        signal = options.signal
        return new Promise(resolve => { resolveImport = resolve })
      })
      const utils = await renderWithDefaultCategory()
      act(() => utils.result.current.setUrlsText('https://a.com\nhttps://b.com\nhttps://c.com'))

      let importPromise!: Promise<void>
      act(() => { importPromise = utils.result.current.handleImport() })
      await waitFor(() => expect(utils.result.current.importModalState).toBe('running'))

      return {
        ...utils,
        getSignal: () => signal,
        finish: async (result: unknown) => {
          await act(async () => {
            resolveImport(result)
            await importPromise
          })
        },
      }
    }

    const CANCELLED_RESULT = {
      imported: 1, skipped: 0, duplicates: 0, failures: [],
      cancelled: true, notProcessed: ['https://b.com', 'https://c.com'],
    }

    it('aborts the signal handed to importLinks', async () => {
      const { result, getSignal, finish } = await startPendingImport()
      expect(getSignal()?.aborted).toBe(false)

      act(() => result.current.cancelImport())

      expect(getSignal()?.aborted).toBe(true)
      await finish(CANCELLED_RESULT)
    })

    it('goes running -> cancelled on a cancelled result and keeps the URLs input', async () => {
      const { result, finish } = await startPendingImport()

      act(() => result.current.cancelImport())
      await finish(CANCELLED_RESULT)

      expect(result.current.importModalState).toBe('cancelled')
      expect(result.current.notProcessed).toEqual(['https://b.com', 'https://c.com'])
      expect(result.current.urlsText).toBe('https://a.com\nhttps://b.com\nhttps://c.com')
    })

    it('is cancelling between the click and the import resolving', async () => {
      const { result, finish } = await startPendingImport()
      expect(result.current.cancelling).toBe(false)

      act(() => result.current.cancelImport())
      expect(result.current.cancelling).toBe(true)
      expect(result.current.importModalState).toBe('running')

      await finish(CANCELLED_RESULT)
      expect(result.current.cancelling).toBe(false)
    })

    it('closes from cancelled', async () => {
      const { result, finish } = await startPendingImport()
      act(() => result.current.cancelImport())
      await finish(CANCELLED_RESULT)

      act(() => result.current.closeImportModal())

      expect(result.current.importModalState).toBe('closed')
    })

    it('is a no-op when not running', async () => {
      const { result } = await renderWithDefaultCategory()

      act(() => result.current.cancelImport())

      expect(result.current.cancelling).toBe(false)
      expect(result.current.importModalState).toBe('closed')
    })

    it('passes the signal to importVaultExport on the v2 path, and aborts it on cancel', async () => {
      let resolveImport: (v: unknown) => void = () => {}
      let signal: AbortSignal | undefined
      mockImportVaultExport.mockImplementation((_data: unknown, options: { signal?: AbortSignal }) => {
        signal = options.signal
        return new Promise(resolve => { resolveImport = resolve })
      })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      let importPromise!: Promise<void>
      act(() => { importPromise = result.current.handleImport() })
      await waitFor(() => expect(result.current.importModalState).toBe('running'))

      expect(signal).toBeInstanceOf(AbortSignal)
      act(() => result.current.cancelImport())
      expect(signal?.aborted).toBe(true)

      await act(async () => {
        resolveImport({
          imported: 0, skipped: 0, duplicates: 0, failures: [], cancelled: true, notProcessed: ['https://example.com'],
          categoriesCreated: 1, domainsCreated: 0, domainsFailed: 0, tagsCreated: 0, preferencesFailed: [],
        })
        await importPromise
      })

      expect(result.current.importModalState).toBe('cancelled')
      expect(result.current.jsonText).toBe(JSON.stringify(VAULT_EXPORT))
    })
  })
})
