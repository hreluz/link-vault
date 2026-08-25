// @vitest-environment jsdom

// Behavior (export/import logic, toasts, service calls) is covered by
// tests/hooks/importExport/useLinkExport.test.ts, useLinkImport.test.ts, and
// tests/utils/linksCsv.test.ts. This file only covers what genuinely needs a
// rendered DOM: initial layout, tab-switching UI, and a couple of DOM-binding
// smoke tests (does the button disabled state / imported-count text actually
// reflect the hook's state).

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import ImportExportClient from '@/app/dashboard/config/import-export/ImportExportClient'

const MOCK_CATEGORIES = [
  { id: 'cat-0', user_id: 'u1', name: 'Not defined', emoticon: '🔖', color: null, description: null, created_at: '', updated_at: '' },
  { id: 'cat-1', user_id: 'u1', name: 'YouTube', emoticon: '📺', color: null, description: null, created_at: '', updated_at: '' },
  { id: 'cat-2', user_id: 'u1', name: 'GitHub', emoticon: '💻', color: null, description: null, created_at: '', updated_at: '' },
]

const { mockImportLinks, mockUseCategoryList } = vi.hoisted(() => ({
  mockImportLinks: vi.fn(),
  mockUseCategoryList: vi.fn(),
}))

vi.mock('@/lib/services/links', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/links')>()
  return { ...actual, importLinks: mockImportLinks }
})

vi.mock('@/lib/hooks/categories/useCategoryList', () => ({
  useCategoryList: mockUseCategoryList,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('@/lib/services/categories', () => ({
  getCategories: vi.fn(),
  getOrCreateCategoryByName: vi.fn(),
}))

vi.mock('@/lib/services/importExport/exportVault', () => ({
  buildVaultExport: vi.fn().mockResolvedValue({
    data: { format: 'link-vault-export', version: 2, exportedAt: '', mode: 'links', links: [] },
    hiddenPrivateLinksCount: 0,
  }),
}))

vi.mock('@/lib/services/importExport/importVault', () => ({
  importVaultExport: vi.fn(),
}))

vi.mock('@/lib/services/tags/tags', () => ({
  getPrivateTagIds: vi.fn().mockResolvedValue([]),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

const FAKE_DEK = {} as CryptoKey
vi.mock('@/lib/context/VaultContext', () => ({
  useVault: () => ({ dek: FAKE_DEK, isUnlocked: true, unlock: vi.fn(), changePassword: vi.fn(), lock: vi.fn() }),
}))

vi.mock('@/lib/context/UnlockedTagsContext', () => ({
  useUnlockedTags: () => ({ unlockedTagIds: new Set(), unlockTag: vi.fn(), lockTag: vi.fn(), lockAll: vi.fn() }),
}))

vi.mock('@/lib/context/TagsContext', () => ({
  useTagsContext: () => ({
    tags: [{ id: 'react', name: 'react', color: null, is_private: false, created_at: '', link_count: 0 }],
    loading: false,
    refetchTags: vi.fn(),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCategoryList.mockReturnValue({ categories: MOCK_CATEGORIES, loading: false })
  mockImportLinks.mockResolvedValue({ imported: 2, skipped: 0, duplicates: 0 })
})

afterEach(() => {
  cleanup()
})

function btn(name: string) {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

describe('ImportExportClient', () => {
  describe('initial rendering', () => {
    it('shows the Paste URLs tab as active by default', () => {
      render(<ImportExportClient />)

      expect(screen.getByText('🔗 Paste URLs').className).toContain('bg-primary-600')
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
  })

  describe('tab switching', () => {
    it('activates the JSON tab when clicked', () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📋 Paste JSON'))

      expect(screen.getByText('📋 Paste JSON').className).toContain('bg-primary-600')
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
  })

  describe('URLs import', () => {
    it('enables the import button when URLs are entered', () => {
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })

      expect(btn('Import links').disabled).toBe(false)
    })

    it('renders the imported count inline after a successful import', async () => {
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com' } })
      fireEvent.click(btn('Import links'))

      await waitFor(() => expect(screen.getByText(/2 links imported/)).toBeTruthy())
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
  })

  describe('malformed v2 export', () => {
    const INVALID_V2_JSON = JSON.stringify({
      format: 'link-vault-export', version: 2, exportedAt: '', mode: 'everything',
      links: [], categories: 'oops',
    })

    it('shows an inline error banner instead of the appearance checkbox', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📋 Paste JSON'))
      fireEvent.change(screen.getByRole('textbox'), { target: { value: INVALID_V2_JSON } })

      await waitFor(() => expect(screen.getByText(/Invalid export file/)).toBeTruthy())
    })

    it('disables the Import links button while the detected v2 export is invalid', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📋 Paste JSON'))
      fireEvent.change(screen.getByRole('textbox'), { target: { value: INVALID_V2_JSON } })

      await waitFor(() => expect(screen.getByText(/Invalid export file/)).toBeTruthy())
      expect(btn('Import links').disabled).toBe(true)
    })
  })

  describe('progress label', () => {
    it('shows the in-flight progress phase/count in the Import links button while importing', async () => {
      let resolveImport: (v: unknown) => void = () => {}
      mockImportLinks.mockImplementation((
        _inputs: unknown, _cat: unknown, _dek: unknown, onProgress?: (done: number, total: number) => void,
      ) => {
        onProgress?.(1, 2)
        return new Promise(resolve => { resolveImport = resolve })
      })
      render(<ImportExportClient />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com\nhttps://github.com' } })
      fireEvent.click(btn('Import links'))

      await waitFor(() => expect(screen.getByText('Importing… links (1/2)')).toBeTruthy())

      resolveImport({ imported: 2, skipped: 0, duplicates: 0 })
      await waitFor(() => expect(screen.getByText('Import links')).toBeTruthy())
    })
  })
})
