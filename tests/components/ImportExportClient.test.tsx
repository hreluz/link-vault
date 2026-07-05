// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import ImportExportClient from '@/app/dashboard/config/import-export/ImportExportClient'

// ── fixtures ──────────────────────────────────────────────────────────────────

const MOCK_CATEGORIES = [
  { id: 'cat-0', user_id: 'u1', name: 'Not defined', emoticon: '🔖', color: null, description: null, created_at: '', updated_at: '' },
  { id: 'cat-1', user_id: 'u1', name: 'YouTube', emoticon: '📺', color: null, description: null, created_at: '', updated_at: '' },
  { id: 'cat-2', user_id: 'u1', name: 'GitHub', emoticon: '💻', color: null, description: null, created_at: '', updated_at: '' },
]

const MOCK_LINK = {
  id: '1', user_id: 'u1', url: 'https://example.com', title: 'Example',
  description: null, site_name: 'example.com', category_id: null,
  status: 'unread' as const, is_favorite: false, notes: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null,
  tags: ['react'],
}

// ── shared mocks ──────────────────────────────────────────────────────────────

const {
  mockImportLinks, mockGetLinks, mockUseCategoryList,
  mockToastSuccess, mockToastError, mockToastWarning,
  mockGetCategories, mockGetOrCreateCategoryByName,
} = vi.hoisted(() => ({
  mockImportLinks: vi.fn(),
  mockGetLinks: vi.fn(),
  mockUseCategoryList: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
  mockGetCategories: vi.fn(),
  mockGetOrCreateCategoryByName: vi.fn(),
}))

vi.mock('@/lib/services/links', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/links')>()
  return { ...actual, importLinks: mockImportLinks, getLinks: mockGetLinks }
})

vi.mock('@/lib/hooks/categories/useCategoryList', () => ({
  useCategoryList: mockUseCategoryList,
}))

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    warning: mockToastWarning,
  },
}))

vi.mock('@/lib/services/categories', () => ({
  getCategories: mockGetCategories,
  getOrCreateCategoryByName: mockGetOrCreateCategoryByName,
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
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

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCategoryList.mockReturnValue({ categories: MOCK_CATEGORIES, loading: false })
  mockImportLinks.mockResolvedValue({ imported: 2, skipped: 0, duplicates: 0 })
  mockGetLinks.mockResolvedValue([MOCK_LINK])
  mockGetCategories.mockResolvedValue([])
  mockGetOrCreateCategoryByName.mockResolvedValue('cat-resolved')

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

afterEach(() => {
  cleanup()
})

// ── helpers ───────────────────────────────────────────────────────────────────

function btn(name: string) {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

function select() {
  return screen.getByRole('combobox') as HTMLSelectElement
}

function clickImport() {
  fireEvent.click(btn('Import links'))
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ImportExportClient', () => {
  describe('initial rendering', () => {
    it('shows the Paste URLs tab as active by default', () => {
      render(<ImportExportClient />)

      expect(screen.getByText('🔗 Paste URLs').className).toContain('bg-indigo-600')
    })

    it('renders a textarea on the URLs tab', () => {
      render(<ImportExportClient />)

      expect(screen.getByRole('textbox')).toBeTruthy()
    })

    it('disables the import button when textarea is empty', () => {
      render(<ImportExportClient />)

      expect(btn('Import links').disabled).toBe(true)
    })

    it('shows Export as JSON and Export as CSV buttons', () => {
      render(<ImportExportClient />)

      expect(screen.getByRole('button', { name: /Export as JSON/ })).toBeTruthy()
      expect(screen.getByRole('button', { name: /Export as CSV/ })).toBeTruthy()
    })
  })

  describe('category selector', () => {
    it('renders user categories from useCategoryList', () => {
      render(<ImportExportClient />)

      expect(screen.getByRole('option', { name: '📺 YouTube' })).toBeTruthy()
      expect(screen.getByRole('option', { name: '💻 GitHub' })).toBeTruthy()
    })

    it('does not include a "No category" placeholder option', () => {
      render(<ImportExportClient />)

      expect(screen.queryByRole('option', { name: /No category/i })).toBeNull()
    })

    it('auto-selects the "Not defined" category when categories load', async () => {
      render(<ImportExportClient />)

      await waitFor(() => expect(select().value).toBe('cat-0'))
    })

    it('passes the selected category to importLinks', async () => {
      render(<ImportExportClient />)
      await waitFor(() => expect(select().value).toBe('cat-0'))

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      fireEvent.change(select(), { target: { value: 'cat-2' } })
      clickImport()

      await waitFor(() => expect(mockImportLinks).toHaveBeenCalledWith(expect.any(Array), 'cat-2', FAKE_DEK))
    })
  })

  describe('tab switching', () => {
    it('activates the JSON tab when clicked', () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📋 Paste JSON'))

      expect(screen.getByText('📋 Paste JSON').className).toContain('bg-indigo-600')
    })

    it('shows a textarea on the JSON tab', () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📋 Paste JSON'))

      expect(screen.getByRole('textbox')).toBeTruthy()
    })

    it('shows the file drop zone when File tab is clicked', () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📁 Upload file'))

      expect(screen.getByText('Drop your file here')).toBeTruthy()
    })

    it('resets the last result when switching tabs', async () => {
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      clickImport()
      await waitFor(() => expect(screen.getByText(/2 links imported/)).toBeTruthy())

      fireEvent.click(screen.getByText('📋 Paste JSON'))

      expect(screen.queryByText(/2 links imported/)).toBeNull()
    })
  })

  describe('URLs import', () => {
    it('enables the import button when URLs are entered', () => {
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })

      expect(btn('Import links').disabled).toBe(false)
    })

    it('calls importLinks with one entry per non-blank line', async () => {
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'https://example.com\nhttps://github.com\n  \n' },
      })
      clickImport()

      await waitFor(() =>
        expect(mockImportLinks).toHaveBeenCalledWith(
          [{ url: 'https://example.com', tags: [] }, { url: 'https://github.com', tags: [] }],
          'cat-0',
          FAKE_DEK,
        ),
      )
    })

    it('trims whitespace from each URL', async () => {
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '  https://example.com  ' } })
      clickImport()

      await waitFor(() =>
        expect(mockImportLinks).toHaveBeenCalledWith(
          [{ url: 'https://example.com', tags: [] }],
          expect.anything(),
          FAKE_DEK,
        ),
      )
    })

    it('shows a success toast with the imported count', async () => {
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      clickImport()

      await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Imported 2 links'))
    })

    it('shows a warning toast when nothing is imported', async () => {
      mockImportLinks.mockResolvedValue({ imported: 0, skipped: 1, duplicates: 0 })
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      clickImport()

      await waitFor(() => expect(mockToastWarning).toHaveBeenCalled())
    })

    it('renders the imported count inline after a successful import', async () => {
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      clickImport()

      await waitFor(() => expect(screen.getByText(/2 links imported/)).toBeTruthy())
    })

    it('clears the textarea after a successful import', async () => {
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      clickImport()

      await waitFor(() => expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(''))
    })

    it('includes the skipped count in the inline result when > 0', async () => {
      mockImportLinks.mockResolvedValue({ imported: 1, skipped: 3, duplicates: 0 })
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      clickImport()

      await waitFor(() => {
        const resultEl = screen.getByText(/1 link imported/)
        expect(resultEl.textContent).toContain('3 invalid')
      })
    })

    it('shows duplicate count in the inline result when > 0', async () => {
      mockImportLinks.mockResolvedValue({ imported: 2, skipped: 0, duplicates: 3 })
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      clickImport()

      await waitFor(() => {
        const resultEl = screen.getByText(/2 links imported/)
        expect(resultEl.textContent).toContain('3 already existed')
      })
    })

    it('appends duplicate count to the success toast when duplicates > 0', async () => {
      mockImportLinks.mockResolvedValue({ imported: 1, skipped: 0, duplicates: 2 })
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      clickImport()

      await waitFor(() =>
        expect(mockToastSuccess).toHaveBeenCalledWith('Imported 1 link (2 already existed)'),
      )
    })

    it('shows duplicate count in the warning toast when all links are duplicates', async () => {
      mockImportLinks.mockResolvedValue({ imported: 0, skipped: 0, duplicates: 3 })
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      clickImport()

      await waitFor(() =>
        expect(mockToastWarning).toHaveBeenCalledWith('No links imported — 3 already existed'),
      )
    })
  })

  describe('JSON import', () => {
    beforeEach(() => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📋 Paste JSON'))
    })

    it('enables the import button when JSON is pasted', () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '[{"url":"https://example.com"}]' },
      })

      expect(btn('Import links').disabled).toBe(false)
    })

    it('calls importLinks with parsed JSON entries', async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '[{"url":"https://example.com","tags":["react"]}]' },
      })
      clickImport()

      await waitFor(() =>
        expect(mockImportLinks).toHaveBeenCalledWith(
          [{ url: 'https://example.com', tags: ['react'] }],
          expect.anything(),
          FAKE_DEK,
        ),
      )
    })

    it('shows an error toast for malformed JSON', async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'not json at all' } })
      clickImport()

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Invalid JSON'))
    })

    it('shows an error toast when JSON is not an array', async () => {
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '{"url":"https://example.com"}' },
      })
      clickImport()

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('JSON must be an array'))
    })
  })

  describe('file import', () => {
    it('shows the filename when a file is selected', () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📁 Upload file'))

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['[{"url":"https://example.com"}]'], 'links.json', { type: 'application/json' })
      Object.defineProperty(input, 'files', { value: [file], configurable: true })
      fireEvent.change(input)

      expect(screen.getByText('links.json')).toBeTruthy()
    })

    it('calls importLinks with parsed JSON from the uploaded file', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📁 Upload file'))

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(
        ['[{"url":"https://example.com","tags":["test"]}]'],
        'links.json',
        { type: 'application/json' },
      )
      Object.defineProperty(input, 'files', { value: [file], configurable: true })
      fireEvent.change(input)
      clickImport()

      await waitFor(() =>
        expect(mockImportLinks).toHaveBeenCalledWith(
          [{ url: 'https://example.com', tags: ['test'] }],
          expect.anything(),
          FAKE_DEK,
        ),
      )
    })
  })

  describe('export', () => {
    it('calls getLinks when Export as JSON is clicked', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByRole('button', { name: /Export as JSON/ }))

      await waitFor(() => expect(mockGetLinks).toHaveBeenCalled())
    })

    it('calls getLinks when Export as CSV is clicked', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByRole('button', { name: /Export as CSV/ }))

      await waitFor(() => expect(mockGetLinks).toHaveBeenCalled())
    })

    it('shows a success toast after JSON export', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByRole('button', { name: /Export as JSON/ }))

      await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Exported 1 links as JSON'))
    })

    it('shows a success toast after CSV export', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByRole('button', { name: /Export as CSV/ }))

      await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Exported 1 links as CSV'))
    })

    it('triggers a download blob via URL.createObjectURL', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByRole('button', { name: /Export as JSON/ }))

      await waitFor(() => expect(globalThis.URL.createObjectURL).toHaveBeenCalled())
    })

    it('calls getCategories when exporting as CSV', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByRole('button', { name: /Export as CSV/ }))

      await waitFor(() => expect(mockGetCategories).toHaveBeenCalled())
    })

    it('does not call getCategories when exporting as JSON', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByRole('button', { name: /Export as JSON/ }))

      await waitFor(() => expect(mockGetLinks).toHaveBeenCalled())
      expect(mockGetCategories).not.toHaveBeenCalled()
    })
  })

  describe('CSV file import', () => {
    const CSV = [
      'url,title,site_name,category,status,is_favorite,notes,tags,created_at',
      'https://example.com,,example.com,Article,unread,false,,react,2026-01-01',
    ].join('\n')

    it('resolves category name to an id via getOrCreateCategoryByName', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📁 Upload file'))

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([CSV], 'links.csv', { type: 'text/csv' })
      Object.defineProperty(input, 'files', { value: [file], configurable: true })
      fireEvent.change(input)
      clickImport()

      await waitFor(() =>
        expect(mockGetOrCreateCategoryByName).toHaveBeenCalledWith('Article', FAKE_DEK),
      )
    })

    it('passes the resolved category_id to importLinks', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📁 Upload file'))

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([CSV], 'links.csv', { type: 'text/csv' })
      Object.defineProperty(input, 'files', { value: [file], configurable: true })
      fireEvent.change(input)
      clickImport()

      await waitFor(() =>
        expect(mockImportLinks).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ url: 'https://example.com', category_id: 'cat-resolved' }),
          ]),
          expect.anything(),
          FAKE_DEK,
        ),
      )
    })

    it('correctly parses a quoted title field that contains commas', async () => {
      const csvWithCommas = [
        'url,title,site_name,category,status,is_favorite,notes,tags,created_at',
        'https://example.com,"Title with, a, comma",example.com,Article,unread,false,,react,2026-01-01',
      ].join('\n')

      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📁 Upload file'))

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([csvWithCommas], 'links.csv', { type: 'text/csv' })
      Object.defineProperty(input, 'files', { value: [file], configurable: true })
      fireEvent.change(input)
      clickImport()

      await waitFor(() =>
        expect(mockGetOrCreateCategoryByName).toHaveBeenCalledWith('Article', FAKE_DEK),
      )
    })

    it('sets category_id to null when the category column is blank', async () => {
      const csvNoCategory = [
        'url,title,site_name,category,status,is_favorite,notes,tags,created_at',
        'https://example.com,,,,,false,,,2026-01-01',
      ].join('\n')

      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📁 Upload file'))

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File([csvNoCategory], 'links.csv', { type: 'text/csv' })
      Object.defineProperty(input, 'files', { value: [file], configurable: true })
      fireEvent.change(input)
      clickImport()

      await waitFor(() =>
        expect(mockImportLinks).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ url: 'https://example.com', category_id: null }),
          ]),
          expect.anything(),
          FAKE_DEK,
        ),
      )
      expect(mockGetOrCreateCategoryByName).not.toHaveBeenCalled()
    })
  })
})
