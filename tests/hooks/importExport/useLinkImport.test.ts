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
  mockToastSuccess, mockToastError, mockToastWarning, mockRefetchTags,
} = vi.hoisted(() => ({
  mockImportLinks: vi.fn(),
  mockUseCategoryList: vi.fn(),
  mockGetOrCreateCategoryByName: vi.fn(),
  mockImportVaultExport: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
  mockRefetchTags: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError, warning: mockToastWarning },
}))

vi.mock('@/lib/services/links', () => ({
  importLinks: mockImportLinks,
}))

vi.mock('@/lib/services/categories', () => ({
  getOrCreateCategoryByName: mockGetOrCreateCategoryByName,
}))

vi.mock('@/lib/services/importExport/importVault', () => ({
  importVaultExport: mockImportVaultExport,
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

      expect(mockImportLinks).toHaveBeenCalledWith(expect.any(Array), 'cat-2', FAKE_DEK, expect.any(Function))
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
        expect.any(Function),
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
        expect.any(Function),
      )
    })

    it('shows a success toast with the imported count', async () => {
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      await act(async () => { await result.current.handleImport() })

      expect(mockToastSuccess).toHaveBeenCalledWith('Imported 2 links')
    })

    it('shows a warning toast when nothing is imported', async () => {
      mockImportLinks.mockResolvedValue({ imported: 0, skipped: 1, duplicates: 0 })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      await act(async () => { await result.current.handleImport() })

      expect(mockToastWarning).toHaveBeenCalled()
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

    it('appends duplicate count to the success toast when duplicates > 0', async () => {
      mockImportLinks.mockResolvedValue({ imported: 1, skipped: 0, duplicates: 2 })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      await act(async () => { await result.current.handleImport() })

      expect(mockToastSuccess).toHaveBeenCalledWith('Imported 1 link (2 already existed)')
    })

    it('shows duplicate count in the warning toast when all links are duplicates', async () => {
      mockImportLinks.mockResolvedValue({ imported: 0, skipped: 0, duplicates: 3 })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      await act(async () => { await result.current.handleImport() })

      expect(mockToastWarning).toHaveBeenCalledWith('No links imported — 3 already existed')
    })

    it('includes both skipped and duplicate counts in the warning toast', async () => {
      mockImportLinks.mockResolvedValue({ imported: 0, skipped: 2, duplicates: 1 })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.setUrlsText('https://example.com'))

      await act(async () => { await result.current.handleImport() })

      expect(mockToastWarning).toHaveBeenCalledWith('No links imported — 1 already existed, 2 invalid')
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
        expect.any(Function),
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
        expect.any(Function),
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
        expect.any(Function),
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
        expect.any(Function),
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
        expect.any(Function),
      )
      expect(mockGetOrCreateCategoryByName).not.toHaveBeenCalled()
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
        { defaultCategoryId: 'cat-0', applyPreferences: true, onProgress: expect.any(Function) },
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
        { defaultCategoryId: 'cat-0', applyPreferences: true, onProgress: expect.any(Function) },
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
        { defaultCategoryId: 'cat-0', applyPreferences: false, onProgress: expect.any(Function) },
        FAKE_DEK,
      )
    })

    it('shows a success toast including categories/tags created', async () => {
      mockImportVaultExport.mockResolvedValue({
        imported: 1, skipped: 0, duplicates: 0, categoriesCreated: 1, domainsCreated: 0, tagsCreated: 1,
      })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      await act(async () => { await result.current.handleImport() })

      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('1 categories'))
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('1 tags'))
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

    it('shows a warning toast when nothing is imported from a v2 export', async () => {
      mockImportVaultExport.mockResolvedValue({
        imported: 0, skipped: 0, duplicates: 1, categoriesCreated: 0, domainsCreated: 0, tagsCreated: 0,
      })
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      await act(async () => { await result.current.handleImport() })

      expect(mockToastWarning).toHaveBeenCalledWith('No links imported — 1 already existed')
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

    it('surfaces a thrown error\'s message instead of the generic "Import failed" text', async () => {
      mockImportVaultExport.mockRejectedValue(new Error('boom: something specific went wrong'))
      const { result } = await renderWithDefaultCategory()
      act(() => result.current.switchTab('json'))
      act(() => result.current.setJsonText(JSON.stringify(VAULT_EXPORT)))
      await waitFor(() => expect(result.current.detectedVaultExport).not.toBeNull())

      await act(async () => { await result.current.handleImport() })

      expect(mockToastError).toHaveBeenCalledWith('boom: something specific went wrong')
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
        _inputs: unknown, _cat: unknown, _dek: unknown, onProgress?: (done: number, total: number) => void,
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
})
