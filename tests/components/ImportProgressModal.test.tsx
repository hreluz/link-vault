// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import ImportProgressModal from '@/app/dashboard/config/import-export/ImportProgressModal'
import type { ImportStats } from '@/lib/hooks/importExport/useLinkImport'

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}))

const STATS: ImportStats = {
  imported: 2, duplicates: 0, failed: 1, metaMissing: 0,
  failures: [{ url: 'not a url', reason: 'invalid_url' }],
}

const LINKS_RUN = { isVault: false, withMetadata: false }

type Props = React.ComponentProps<typeof ImportProgressModal>

function renderModal(overrides: Partial<Props> = {}) {
  const props: Props = {
    state: 'running',
    stats: STATS,
    run: LINKS_RUN,
    progress: { phase: 'links', done: 3, total: 10 },
    result: null,
    error: null,
    onClose: vi.fn(),
    ...overrides,
  }
  return { ...render(<ImportProgressModal {...props} />), props }
}

const writeText = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

afterEach(cleanup)

describe('ImportProgressModal', () => {
  it('renders nothing when closed', () => {
    renderModal({ state: 'closed' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  describe('running', () => {
    it('shows processed, total and remaining', () => {
      renderModal()
      expect(screen.getByText('Processing 3 of 10 — 7 remaining')).toBeTruthy()
    })

    it('shows the imported, already existed and failed counters', () => {
      renderModal({ stats: { ...STATS, duplicates: 4 } })
      expect(screen.getByText('Imported').parentElement!.textContent).toContain('2')
      expect(screen.getByText('Already existed').parentElement!.textContent).toContain('4')
      expect(screen.getByText('Failed').parentElement!.textContent).toContain('1')
    })

    it('reports progress on the progressbar', () => {
      renderModal()
      const bar = screen.getByRole('progressbar')
      expect(bar.getAttribute('aria-valuenow')).toBe('3')
      expect(bar.getAttribute('aria-valuemax')).toBe('10')
    })

    it('shows "Preparing…" before the first progress event', () => {
      renderModal({ progress: null, stats: { ...STATS, imported: 0, failed: 0, failures: [] } })
      expect(screen.getByText('Preparing…')).toBeTruthy()
      expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull()
    })

    it('has no close control', () => {
      renderModal()
      expect(screen.queryAllByRole('button')).toHaveLength(0)
    })

    it('does not close on Escape', () => {
      const { props } = renderModal()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(props.onClose).not.toHaveBeenCalled()
    })

    it('does not close on a backdrop click', () => {
      const { props } = renderModal()
      const backdrop = screen.getByRole('dialog').parentElement!
      fireEvent.mouseDown(backdrop)
      fireEvent.click(backdrop)
      expect(props.onClose).not.toHaveBeenCalled()
    })

    it('shows the current phase for a v2 restore before links', () => {
      renderModal({
        run: { isVault: true, withMetadata: false },
        progress: { phase: 'tags', done: 1, total: 3 },
        stats: { ...STATS, imported: 0, failed: 0, failures: [] },
      })
      expect(screen.getByText('Creating tags')).toBeTruthy()
      expect(screen.getByText('1 of 3')).toBeTruthy()
    })
  })

  describe('without-metadata counter', () => {
    it('is shown when the run fetches metadata', () => {
      renderModal({ run: { isVault: false, withMetadata: true }, stats: { ...STATS, metaMissing: 2 } })
      expect(screen.getByText('Without metadata').parentElement!.textContent).toContain('2')
    })

    it('is hidden when the run does not fetch metadata', () => {
      renderModal()
      expect(screen.queryByText('Without metadata')).toBeNull()
    })
  })

  describe('finished', () => {
    it('lists each failed URL with its reason', () => {
      renderModal({
        state: 'finished',
        progress: null,
        stats: {
          ...STATS, failed: 2,
          failures: [{ url: 'not a url', reason: 'invalid_url' }, { url: 'https://x.com', reason: 'save_error' }],
        },
      })
      const list = screen.getByRole('list')
      expect(list.textContent).toContain('not a url')
      expect(list.textContent).toContain('Invalid URL')
      expect(list.textContent).toContain('https://x.com')
      expect(list.textContent).toContain("Couldn't save")
    })

    it('copies the failed URLs one per line', async () => {
      renderModal({
        state: 'finished',
        progress: null,
        stats: {
          ...STATS, failed: 2,
          failures: [{ url: 'not a url', reason: 'invalid_url' }, { url: 'https://x.com', reason: 'save_error' }],
        },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Copy failed URLs' }))

      expect(writeText).toHaveBeenCalledWith('not a url\nhttps://x.com')
      await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Copied'))
    })

    it('shows an error toast when the clipboard is unavailable', async () => {
      writeText.mockRejectedValue(new Error('denied'))
      renderModal({ state: 'finished', progress: null })
      fireEvent.click(screen.getByRole('button', { name: 'Copy failed URLs' }))

      await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    })

    it('hides "Copy failed URLs" and the list when nothing failed', () => {
      renderModal({ state: 'finished', progress: null, stats: { ...STATS, failed: 0, failures: [] } })
      expect(screen.queryByRole('button', { name: 'Copy failed URLs' })).toBeNull()
      expect(screen.queryByRole('list')).toBeNull()
    })

    it('closes with Done', () => {
      const { props } = renderModal({ state: 'finished', progress: null })
      fireEvent.click(screen.getByRole('button', { name: 'Done' }))
      expect(props.onClose).toHaveBeenCalledOnce()
    })

    it('closes on Escape once finished', () => {
      const { props } = renderModal({ state: 'finished', progress: null })
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(props.onClose).toHaveBeenCalledOnce()
    })

    it('shows what a v2 restore created', () => {
      renderModal({
        state: 'finished',
        progress: null,
        run: { isVault: true, withMetadata: false },
        result: {
          imported: 2, skipped: 0, duplicates: 0,
          categoriesCreated: 2, tagsCreated: 1, domainsCreated: 3,
        },
      })
      expect(screen.getByText('Also created 2 categories, 1 tag, 3 domain rules.')).toBeTruthy()
    })

    it('notes v2 domain rules and preferences that failed', () => {
      renderModal({
        state: 'finished',
        progress: null,
        run: { isVault: true, withMetadata: false },
        result: { imported: 2, skipped: 0, duplicates: 0, domainsFailed: 1, preferencesFailed: ['theme', 'surface'] },
      })
      expect(screen.getByText(/1 domain rule and 2 appearance settings couldn.t be applied/)).toBeTruthy()
    })
  })

  describe('error', () => {
    it('shows the message, the counters reached so far and Done', () => {
      renderModal({ state: 'error', progress: null, error: 'network down' })
      expect(screen.getByText('Import stopped')).toBeTruthy()
      expect(screen.getByText('network down')).toBeTruthy()
      expect(screen.getByText('Imported').parentElement!.textContent).toContain('2')
      expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
    })
  })
})
