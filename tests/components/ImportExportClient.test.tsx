// @vitest-environment jsdom

// Behavior (export/import logic, toasts, service calls) is covered by
// tests/hooks/importExport/useLinkExport.test.ts, useLinkImport.test.ts, and
// tests/utils/linksCsv.test.ts. This file only covers what genuinely needs a
// rendered DOM: initial layout, tab-switching UI, and a couple of DOM-binding
// smoke tests (does the button disabled state / progress modal actually
// reflect the hook's state). The modal itself is covered by ImportProgressModal.test.tsx.

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import ImportExportClient from '@/app/dashboard/config/import-export/ImportExportClient'

const MOCK_CATEGORIES = [
  { id: 'cat-0', user_id: 'u1', name: 'Not defined', emoticon: '🔖', color: null, description: null, created_at: '', updated_at: '' },
  { id: 'cat-1', user_id: 'u1', name: 'YouTube', emoticon: '📺', color: null, description: null, created_at: '', updated_at: '' },
  { id: 'cat-2', user_id: 'u1', name: 'GitHub', emoticon: '💻', color: null, description: null, created_at: '', updated_at: '' },
]

const { mockImportLinks, mockUseCategoryList, mockTriggerDownload } = vi.hoisted(() => ({
  mockImportLinks: vi.fn(),
  mockUseCategoryList: vi.fn(),
  mockTriggerDownload: vi.fn(),
}))

vi.mock('@/lib/utils/downloadFile', () => ({
  triggerDownload: mockTriggerDownload,
}))

vi.mock('@/lib/services/links', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/links')>()
  return { ...actual, importLinks: mockImportLinks }
})

vi.mock('@/app/dashboard/link/actions', () => ({
  fetchLinkMeta: vi.fn(),
}))

vi.mock('@/lib/hooks/categories/useCategoryList', () => ({
  useCategoryList: mockUseCategoryList,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('@/lib/services/categories', () => ({
  getCategories: vi.fn(),
  getOrCreateCategoryByName: vi.fn(),
  PROTECTED_CATEGORY_NAME: 'Not defined',
}))

vi.mock('@/lib/services/category-domains', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/services/category-domains')>()),
  getCategoryIdByDomainMap: vi.fn().mockResolvedValue(new Map()),
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

vi.mock('@/lib/services/tags/tags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/services/tags/tags')>()),
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

/** The URLs/JSON textarea (the import tags field is a textbox too). */
function importBox() {
  return document.querySelector('textarea') as HTMLTextAreaElement
}

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

      expect(importBox()).toBeTruthy()
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

      expect(importBox()).toBeTruthy()
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
      fireEvent.change(importBox(), { target: { value: 'https://example.com' } })

      expect(btn('Import links').disabled).toBe(false)
    })

    it('shows the result in the progress modal instead of an inline banner', async () => {
      render(<ImportExportClient />)
      fireEvent.change(importBox(), { target: { value: 'https://example.com' } })
      fireEvent.click(btn('Import links'))

      const dialog = await screen.findByRole('dialog')
      await waitFor(() => expect(dialog.textContent).toContain('Import finished'))
      expect(screen.queryByText(/links? imported/)).toBeNull()
    })
  })

  describe('time estimate', () => {
    it('shows the link count and an estimate, noting duplicates once auto-fetch is on', () => {
      render(<ImportExportClient />)
      fireEvent.change(importBox(), { target: { value: 'https://a.com\nhttps://b.com' } })
      expect(screen.getByText('2 links · less than a minute')).toBeTruthy()

      fireEvent.click(screen.getByRole('switch', { name: 'Auto-fetch metadata' }))
      expect(screen.getByText(/2 links · less than a minute \(less if some already exist\)/)).toBeTruthy()
    })

    it('is hidden with nothing to import', () => {
      render(<ImportExportClient />)
      expect(screen.queryByText(/ links? · /)).toBeNull()
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

  describe('CSV template and format guide', () => {
    it('shows the template button and a collapsed CSV format guide on the file tab', () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📁 Upload file'))

      expect(btn('Download CSV template')).toBeTruthy()
      const details = screen.getByText('CSV format').closest('details') as HTMLDetailsElement
      expect(details.open).toBe(false)
    })

    it('downloads link-vault-template.csv without opening the file picker', () => {
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📁 Upload file'))

      fireEvent.click(btn('Download CSV template'))

      expect(mockTriggerDownload).toHaveBeenCalledWith(
        expect.stringMatching(/^url,title,/),
        'link-vault-template.csv',
        'text/csv',
      )
      expect(clickSpy).not.toHaveBeenCalled()
      clickSpy.mockRestore()
    })

    it('downloads link-vault-template-minimal.csv without opening the file picker', () => {
      const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📁 Upload file'))

      fireEvent.click(btn('Download minimal template'))

      expect(mockTriggerDownload).toHaveBeenCalledWith(
        expect.stringMatching(/^url,category,tags\n/),
        'link-vault-template-minimal.csv',
        'text/csv',
      )
      expect(clickSpy).not.toHaveBeenCalled()
      clickSpy.mockRestore()
    })

    it('does not show the template button or guide on the URLs or JSON tabs', () => {
      render(<ImportExportClient />)
      expect(screen.queryByRole('button', { name: 'Download CSV template' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Download minimal template' })).toBeNull()
      expect(screen.queryByText('CSV format')).toBeNull()

      fireEvent.click(screen.getByText('📋 Paste JSON'))
      expect(screen.queryByRole('button', { name: 'Download CSV template' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Download minimal template' })).toBeNull()
      expect(screen.queryByText('CSV format')).toBeNull()
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
      fireEvent.change(importBox(), { target: { value: INVALID_V2_JSON } })

      await waitFor(() => expect(screen.getByText(/Invalid export file/)).toBeTruthy())
    })

    it('disables the Import links button while the detected v2 export is invalid', async () => {
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📋 Paste JSON'))
      fireEvent.change(importBox(), { target: { value: INVALID_V2_JSON } })

      await waitFor(() => expect(screen.getByText(/Invalid export file/)).toBeTruthy())
      expect(btn('Import links').disabled).toBe(true)
    })
  })

  describe('progress label', () => {
    it('shows the in-flight progress phase/count in the Import links button while importing', async () => {
      let resolveImport: (v: unknown) => void = () => {}
      mockImportLinks.mockImplementation((
        _inputs: unknown, _cat: unknown, _dek: unknown, { onProgress }: { onProgress?: (done: number, total: number) => void } = {},
      ) => {
        onProgress?.(1, 2)
        return new Promise(resolve => { resolveImport = resolve })
      })
      render(<ImportExportClient />)
      fireEvent.change(importBox(), { target: { value: 'https://example.com\nhttps://github.com' } })
      fireEvent.click(btn('Import links'))

      await waitFor(() => expect(screen.getByText('Importing… links (1/2)')).toBeTruthy())

      resolveImport({ imported: 2, skipped: 0, duplicates: 0 })
      await waitFor(() => expect(screen.getByText('Import links')).toBeTruthy())
    })
  })

  describe('import tags field', () => {
    function tagsInput() {
      return screen.getByLabelText('Tags for imported links (optional)') as HTMLInputElement
    }

    it('renders under the category selector with the non-v2 hint', () => {
      render(<ImportExportClient />)

      expect(tagsInput().disabled).toBe(false)
      expect(tagsInput().getAttribute('aria-describedby')).toBe('import-tags-hint')
      expect(screen.getByText('Added to every imported link, on top of any tags in the file.')).toBeTruthy()
      const select = screen.getByRole('combobox')
      expect(select.compareDocumentPosition(tagsInput()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('is disabled with the v2 hint when a v2 export is detected', async () => {
      const VALID_V2_JSON = JSON.stringify({
        format: 'link-vault-export', version: 2, exportedAt: '', mode: 'links', links: [],
      })
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📋 Paste JSON'))
      fireEvent.change(importBox(), { target: { value: VALID_V2_JSON } })

      await waitFor(() => expect(tagsInput().disabled).toBe(true))
      expect(screen.getByText('Not available for full vault exports — they keep their own tags.')).toBeTruthy()
    })
  })

  describe('auto-fetch metadata switch', () => {
    function autoFetchSwitch() {
      return screen.getByRole('switch', { name: 'Auto-fetch metadata' }) as HTMLButtonElement
    }

    it('renders off and toggles on click', () => {
      render(<ImportExportClient />)

      expect(autoFetchSwitch().getAttribute('aria-checked')).toBe('false')
      fireEvent.click(autoFetchSwitch())
      expect(autoFetchSwitch().getAttribute('aria-checked')).toBe('true')
    })

    it('is disabled with a note when a v2 export is detected', async () => {
      const VALID_V2_JSON = JSON.stringify({
        format: 'link-vault-export', version: 2, exportedAt: '', mode: 'links', links: [],
      })
      render(<ImportExportClient />)
      fireEvent.click(screen.getByText('📋 Paste JSON'))
      fireEvent.change(importBox(), { target: { value: VALID_V2_JSON } })

      await waitFor(() => expect(autoFetchSwitch().disabled).toBe(true))
      expect(screen.getByText(/Not available for full vault exports — they already include metadata/)).toBeTruthy()
    })

    it('shows the without-metadata count in the progress modal', async () => {
      mockImportLinks.mockImplementation(async (
        _inputs: unknown, _cat: unknown, _dek: unknown,
        { onProgress }: { onProgress?: (done: number, total: number, outcome: unknown) => void } = {},
      ) => {
        for (let i = 1; i <= 3; i++) onProgress?.(i, 3, { url: `https://e.com/${i}`, status: 'imported', metaMissing: true })
        return { imported: 3, skipped: 0, duplicates: 0, metaMissing: 3, failures: [] }
      })
      render(<ImportExportClient />)
      fireEvent.click(autoFetchSwitch())
      fireEvent.change(importBox(), { target: { value: 'https://example.com' } })
      fireEvent.click(btn('Import links'))

      const dialog = await screen.findByRole('dialog')
      await waitFor(() => expect(dialog.textContent).toContain('Import finished'))
      const counter = within(dialog).getByText('Without metadata').parentElement!
      expect(counter.textContent).toContain('3')
    })

    it('labels the in-flight import as links + metadata when on', async () => {
      let resolveImport: (v: unknown) => void = () => {}
      mockImportLinks.mockImplementation((
        _inputs: unknown, _cat: unknown, _dek: unknown, { onProgress }: { onProgress?: (done: number, total: number) => void } = {},
      ) => {
        onProgress?.(1, 2)
        return new Promise(resolve => { resolveImport = resolve })
      })
      render(<ImportExportClient />)
      fireEvent.click(autoFetchSwitch())
      fireEvent.change(importBox(), { target: { value: 'https://example.com\nhttps://github.com' } })
      fireEvent.click(btn('Import links'))

      await waitFor(() => expect(screen.getByText('Importing… links + metadata (1/2)')).toBeTruthy())

      resolveImport({ imported: 2, skipped: 0, duplicates: 0, metaMissing: 0 })
      await waitFor(() => expect(screen.getByText('Import links')).toBeTruthy())
    })
  })
})
