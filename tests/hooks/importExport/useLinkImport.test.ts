// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLinkImport } from '@/lib/hooks/importExport/useLinkImport'

const MOCK_CATEGORIES = [
  { id: 'cat-0', user_id: 'u1', name: 'Not defined', emoticon: '🔖', color: null, description: null, created_at: '', updated_at: '' },
  { id: 'cat-1', user_id: 'u1', name: 'YouTube', emoticon: '📺', color: null, description: null, created_at: '', updated_at: '' },
  { id: 'cat-2', user_id: 'u1', name: 'GitHub', emoticon: '💻', color: null, description: null, created_at: '', updated_at: '' },
]

const {
  mockImportLinks, mockUseCategoryList, mockGetOrCreateCategoryByName,
  mockToastSuccess, mockToastError, mockToastWarning, mockRefetchTags,
} = vi.hoisted(() => ({
  mockImportLinks: vi.fn(),
  mockUseCategoryList: vi.fn(),
  mockGetOrCreateCategoryByName: vi.fn(),
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
})

function fileChangeEvent(file: File) {
  return { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
}

async function renderWithDefaultCategory() {
  const utils = renderHook(() => useLinkImport())
  await waitFor(() => expect(utils.result.current.defaultCategoryId).toBe('cat-0'))
  return utils
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

      expect(mockImportLinks).toHaveBeenCalledWith(expect.any(Array), 'cat-2', FAKE_DEK)
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
      'url,title,site_name,category,status,is_favorite,notes,tags,created_at',
      'https://example.com,,example.com,Article,unread,false,,react,2026-01-01',
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
      )
    })

    it('sets category_id to null when the category column is blank', async () => {
      const csvNoCategory = [
        'url,title,site_name,category,status,is_favorite,notes,tags,created_at',
        'https://example.com,,,,,false,,,2026-01-01',
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
      )
      expect(mockGetOrCreateCategoryByName).not.toHaveBeenCalled()
    })
  })
})
