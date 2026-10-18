// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
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
  genericSkipped: [],
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
    cancelling: false,
    notProcessed: [],
    onCancel: vi.fn(),
    onClose: vi.fn(),
    hostBlock: null,
    onBlockWait: vi.fn(),
    onBlockSkip: vi.fn(),
    onBlockLeave: vi.fn(),
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

    it('appends the time left when an estimate is known', () => {
      renderModal({ etaMs: 4 * 60_000 })
      expect(screen.getByText('Processing 3 of 10 — 7 remaining · about 4 min left')).toBeTruthy()
    })

    it('hides the time left while a host block pauses the import', () => {
      renderModal({
        etaMs: 4 * 60_000,
        run: { isVault: false, withMetadata: true },
        hostBlock: { host: 'youtube.com', reason: 'rate_limited', attempt: 1, retryAt: null },
      })
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

    it('has no close control (Cancel is the only button)', () => {
      renderModal()
      expect(screen.queryAllByRole('button').map(b => b.textContent)).toEqual(['Cancel'])
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

  describe('skipped (generic page)', () => {
    const SKIPPED = ['https://instagram.com/p/1', 'https://instagram.com/p/2']
    const META_RUN = { isVault: false, withMetadata: true }

    it('shows the count while running', () => {
      renderModal({ run: META_RUN, stats: { ...STATS, genericSkipped: SKIPPED } })
      expect(screen.getByText('Skipped (generic page)').parentElement!.textContent).toContain('2')
    })

    it('is hidden when the run does not fetch metadata', () => {
      renderModal()
      expect(screen.queryByText('Skipped (generic page)')).toBeNull()
    })

    it('counts skipped rows as processed in the status line', () => {
      renderModal({ run: META_RUN, stats: { ...STATS, genericSkipped: SKIPPED } })
      expect(screen.getByText('Processing 5 of 10 — 5 remaining')).toBeTruthy()
    })

    it('lists the skipped URLs under their heading once finished', () => {
      renderModal({
        state: 'finished', progress: null, run: META_RUN,
        stats: { ...STATS, failed: 0, failures: [], genericSkipped: SKIPPED },
      })
      expect(screen.getByText('Skipped: the site returned a generic page with no metadata')).toBeTruthy()
      const list = screen.getByRole('list')
      expect(list.textContent).toContain('https://instagram.com/p/1')
      expect(list.textContent).toContain('https://instagram.com/p/2')
    })

    it('copies the skipped URLs one per line', async () => {
      renderModal({
        state: 'finished', progress: null, run: META_RUN,
        stats: { ...STATS, genericSkipped: SKIPPED },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Copy skipped URLs' }))

      expect(writeText).toHaveBeenCalledWith('https://instagram.com/p/1\nhttps://instagram.com/p/2')
      await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Copied'))
    })

    it('shows no section or button when nothing was skipped', () => {
      renderModal({ state: 'finished', progress: null, run: META_RUN })
      expect(screen.queryByText('Skipped: the site returned a generic page with no metadata')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Copy skipped URLs' })).toBeNull()
    })

    it('shows the list and button after a cancel too', () => {
      renderModal({
        state: 'cancelled', progress: null, run: META_RUN, notProcessed: ['https://c.com'],
        stats: { ...STATS, genericSkipped: SKIPPED },
      })
      expect(screen.getByText('Skipped: the site returned a generic page with no metadata')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Copy skipped URLs' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Copy unprocessed URLs' })).toBeTruthy()
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

  describe('cancel button', () => {
    it('is shown while running and calls onCancel', () => {
      const { props } = renderModal()
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(props.onCancel).toHaveBeenCalledOnce()
    })

    it('is shown while "Preparing…"', () => {
      renderModal({ progress: null, stats: { ...STATS, imported: 0, failed: 0, failures: [] } })
      expect(screen.getByText('Preparing…')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    })

    it('is shown during a v2 phase before links', () => {
      renderModal({
        run: { isVault: true, withMetadata: false },
        progress: { phase: 'categories', done: 0, total: 2 },
        stats: { ...STATS, imported: 0, failed: 0, failures: [] },
      })
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    })

    it('reads "Stopping…" and is disabled while cancelling', () => {
      const { props } = renderModal({ cancelling: true })
      const button = screen.getByRole('button', { name: 'Stopping…' }) as HTMLButtonElement
      expect(button.disabled).toBe(true)
      fireEvent.click(button)
      expect(props.onCancel).not.toHaveBeenCalled()
    })

    it('does not make Escape close or cancel while running', () => {
      const { props } = renderModal()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(props.onClose).not.toHaveBeenCalled()
      expect(props.onCancel).not.toHaveBeenCalled()
    })

    it('is not shown once finished', () => {
      renderModal({ state: 'finished', progress: null })
      expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
    })
  })

  describe('cancelled', () => {
    const NOT_PROCESSED = ['https://c.com', 'https://d.com', 'https://e.com']

    function renderCancelled(overrides: Partial<Props> = {}) {
      return renderModal({ state: 'cancelled', progress: null, notProcessed: NOT_PROCESSED, ...overrides })
    }

    it('shows the heading, the status line and the Not processed counter', () => {
      renderCancelled()
      expect(screen.getByText('Import cancelled')).toBeTruthy()
      expect(screen.getByText('3 links processed · 3 not processed')).toBeTruthy()
      expect(screen.getByText('Not processed').parentElement!.textContent).toContain('3')
    })

    it('keeps the failed-links list and "Copy failed URLs"', () => {
      renderCancelled()
      expect(screen.getByRole('list').textContent).toContain('not a url')
      expect(screen.getByRole('button', { name: 'Copy failed URLs' })).toBeTruthy()
    })

    it('copies the unprocessed URLs one per line', async () => {
      renderCancelled()
      fireEvent.click(screen.getByRole('button', { name: 'Copy unprocessed URLs' }))

      expect(writeText).toHaveBeenCalledWith('https://c.com\nhttps://d.com\nhttps://e.com')
      await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Copied'))
    })

    it('does not list the unprocessed URLs', () => {
      renderCancelled()
      expect(screen.queryByText('https://c.com')).toBeNull()
    })

    it('hides "Copy unprocessed URLs" when nothing is left unprocessed', () => {
      renderCancelled({ notProcessed: [] })
      expect(screen.queryByRole('button', { name: 'Copy unprocessed URLs' })).toBeNull()
    })

    it('never shows "Copy unprocessed URLs" after an import that finished normally', () => {
      renderModal({ state: 'finished', progress: null, notProcessed: NOT_PROCESSED })
      expect(screen.queryByRole('button', { name: 'Copy unprocessed URLs' })).toBeNull()
      expect(screen.queryByText('Not processed')).toBeNull()
    })

    it('closes with Done, which takes focus', async () => {
      const { props } = renderCancelled()
      const done = screen.getByRole('button', { name: 'Done' })
      await waitFor(() => expect(document.activeElement).toBe(done))
      fireEvent.click(done)
      expect(props.onClose).toHaveBeenCalledOnce()
    })

    it('shows what a cancelled v2 restore created and that remaining steps were skipped', () => {
      renderCancelled({
        run: { isVault: true, withMetadata: false },
        result: { imported: 0, skipped: 0, duplicates: 0, categoriesCreated: 2 },
      })
      expect(screen.getByText(/Also created 2 categories\./)).toBeTruthy()
      expect(screen.getByText(/Remaining steps were skipped\./)).toBeTruthy()
    })

    it('does not mention skipped steps for a plain links import', () => {
      renderCancelled()
      expect(screen.queryByText(/Remaining steps were skipped/)).toBeNull()
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

  describe('throttle wait', () => {
    const LINKS_META_RUN = { isVault: false, withMetadata: true }
    const LINE = /^Next .* link in \d+ s$/

    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('renders the host and the seconds left, and ticks', () => {
      renderModal({ run: LINKS_META_RUN, throttleWait: { host: 'youtube.com', until: Date.now() + 3000 } })
      expect(screen.getByText('Next youtube.com link in 3 s')).toBeTruthy()

      act(() => { vi.advanceTimersByTime(1000) })
      expect(screen.getByText('Next youtube.com link in 2 s')).toBeTruthy()
    })

    it('never shows 0 s, even once the wait has run out', () => {
      renderModal({ run: LINKS_META_RUN, throttleWait: { host: 'youtube.com', until: Date.now() + 1000 } })
      expect(screen.getByText('Next youtube.com link in 1 s')).toBeTruthy()

      act(() => { vi.advanceTimersByTime(3000) })
      expect(screen.getByText('Next youtube.com link in 1 s')).toBeTruthy()
      expect(screen.queryByText('Next youtube.com link in 0 s')).toBeNull()
    })

    it('is hidden while a host block pauses the import', () => {
      renderModal({
        run: LINKS_META_RUN,
        throttleWait: { host: 'youtube.com', until: Date.now() + 3000 },
        hostBlock: { host: 'youtube.com', reason: 'rate_limited', attempt: 1, retryAt: null },
      })
      expect(screen.queryByText(LINE)).toBeNull()
    })

    it('is hidden once the import has finished', () => {
      renderModal({ state: 'finished', run: LINKS_META_RUN, throttleWait: { host: 'youtube.com', until: Date.now() + 3000 } })
      expect(screen.queryByText(LINE)).toBeNull()
    })

    it('is hidden when no wait is in progress', () => {
      renderModal({ run: LINKS_META_RUN, throttleWait: null })
      expect(screen.queryByText(LINE)).toBeNull()
    })
  })

  describe('fetching indicator', () => {
    const LINKS_META_RUN = { isVault: false, withMetadata: true }
    const LINE = /^(Fetching|Still waiting on) .*…$/

    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('renders Fetching <host>… for an in-flight fetch', () => {
      renderModal({ run: LINKS_META_RUN, fetching: { host: 'youtube.com', startedAt: Date.now() } })
      expect(screen.getByText('Fetching youtube.com…')).toBeTruthy()
    })

    it('still reads Fetching… at 9 000 ms', () => {
      renderModal({ run: LINKS_META_RUN, fetching: { host: 'youtube.com', startedAt: Date.now() } })

      act(() => { vi.advanceTimersByTime(9000) })
      expect(screen.getByText('Fetching youtube.com…')).toBeTruthy()
      expect(screen.queryByText('Still waiting on youtube.com…')).toBeNull()
    })

    it('switches to Still waiting on <host>… after 10 000 ms', () => {
      renderModal({ run: LINKS_META_RUN, fetching: { host: 'youtube.com', startedAt: Date.now() } })

      act(() => { vi.advanceTimersByTime(10_000) })
      expect(screen.getByText('Still waiting on youtube.com…')).toBeTruthy()
      expect(screen.queryByText('Fetching youtube.com…')).toBeNull()
    })

    it('is hidden while a host block pauses the import', () => {
      renderModal({
        run: LINKS_META_RUN,
        fetching: { host: 'youtube.com', startedAt: Date.now() },
        hostBlock: { host: 'youtube.com', reason: 'rate_limited', attempt: 1, retryAt: null },
      })
      expect(screen.queryByText(LINE)).toBeNull()
    })

    it('is hidden once the import has finished', () => {
      renderModal({ state: 'finished', run: LINKS_META_RUN, fetching: { host: 'youtube.com', startedAt: Date.now() } })
      expect(screen.queryByText(LINE)).toBeNull()
    })

    it('is hidden when no fetch is in progress', () => {
      renderModal({ run: LINKS_META_RUN, fetching: null })
      expect(screen.queryByText(LINE)).toBeNull()
    })

    it('yields to the countdown when both are set', () => {
      renderModal({
        run: LINKS_META_RUN,
        throttleWait: { host: 'youtube.com', until: Date.now() + 3000 },
        fetching: { host: 'youtube.com', startedAt: Date.now() },
      })
      expect(screen.getByText('Next youtube.com link in 3 s')).toBeTruthy()
      expect(screen.queryByText(LINE)).toBeNull()
    })
  })

  describe('host blocked', () => {
    const BLOCK = { host: 'instagram.com', reason: 'rate_limited' as const, attempt: 1, retryAt: null }
    const LINKS_META_RUN = { isVault: false, withMetadata: true }

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows the host and the rate-limited reason', () => {
      renderModal({ run: LINKS_META_RUN, hostBlock: BLOCK })
      expect(screen.getByText('instagram.com seems to be limiting our requests.')).toBeTruthy()
      expect(screen.getByText('It answered "Too many requests".')).toBeTruthy()
      expect(screen.queryByText(/Still blocked/)).toBeNull()
    })

    it('shows the empty-responses reason', () => {
      renderModal({ run: LINKS_META_RUN, hostBlock: { ...BLOCK, reason: 'empty_responses' } })
      expect(screen.getByText('The last 3 links from it came back empty.')).toBeTruthy()
    })

    it('shows the attempt from the second prompt on', () => {
      renderModal({ run: LINKS_META_RUN, hostBlock: { ...BLOCK, attempt: 2 } })
      expect(screen.getByText('Still blocked (attempt 2).')).toBeTruthy()
    })

    it('replaces Cancel with the three choices', () => {
      renderModal({ run: LINKS_META_RUN, hostBlock: BLOCK })
      expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Wait 1 minute and retry' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Import without metadata' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Leave and try later' })).toBeTruthy()
    })

    it('calls each handler from its button', () => {
      const { props } = renderModal({ run: LINKS_META_RUN, hostBlock: BLOCK })
      fireEvent.click(screen.getByRole('button', { name: 'Wait 1 minute and retry' }))
      fireEvent.click(screen.getByRole('button', { name: 'Import without metadata' }))
      fireEvent.click(screen.getByRole('button', { name: 'Leave and try later' }))
      expect(props.onBlockWait).toHaveBeenCalledTimes(1)
      expect(props.onBlockSkip).toHaveBeenCalledTimes(1)
      expect(props.onBlockLeave).toHaveBeenCalledTimes(1)
      expect(props.onCancel).not.toHaveBeenCalled()
    })

    it('renders the countdown from retryAt, disables only the wait button, and ticks', () => {
      vi.useFakeTimers()
      const now = Date.now()
      renderModal({ run: LINKS_META_RUN, hostBlock: { ...BLOCK, retryAt: now + 42_000 } })

      const wait = screen.getByRole('button', { name: 'Retrying in 0:42' }) as HTMLButtonElement
      expect(wait.disabled).toBe(true)
      expect((screen.getByRole('button', { name: 'Import without metadata' }) as HTMLButtonElement).disabled).toBe(false)
      expect((screen.getByRole('button', { name: 'Leave and try later' }) as HTMLButtonElement).disabled).toBe(false)

      act(() => { vi.advanceTimersByTime(2000) })
      expect(screen.getByRole('button', { name: 'Retrying in 0:40' })).toBeTruthy()
    })

    it('never shows more than the 1 minute wait', () => {
      renderModal({ run: LINKS_META_RUN, hostBlock: { ...BLOCK, retryAt: Date.now() + 90_000 } })
      expect(screen.getByRole('button', { name: 'Retrying in 1:00' })).toBeTruthy()
    })

    it.each([
      [60_000, 'Wait 1 minute and retry'],
      [45_000, 'Wait 45 s and retry'],
      [120_000, 'Wait 2 minutes and retry'],
      [90_000, 'Wait 1 min 30 s and retry'],
    ])('labels a %i ms retry wait as "%s"', (retryWaitMs, label) => {
      renderModal({ run: LINKS_META_RUN, hostBlock: BLOCK, retryWaitMs })
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    })

    it('shows the configured empty-streak limit', () => {
      renderModal({ run: LINKS_META_RUN, hostBlock: { ...BLOCK, reason: 'empty_responses' }, emptyStreakLimit: 5 })
      expect(screen.getByText('The last 5 links from it came back empty.')).toBeTruthy()
    })

    it('uses the singular when the empty-streak limit is 1', () => {
      renderModal({ run: LINKS_META_RUN, hostBlock: { ...BLOCK, reason: 'empty_responses' }, emptyStreakLimit: 1 })
      expect(screen.getByText('The last link from it came back empty.')).toBeTruthy()
    })

    it('starts the countdown at the configured wait and never shows more', () => {
      renderModal({ run: LINKS_META_RUN, hostBlock: { ...BLOCK, retryAt: Date.now() + 31_000 }, retryWaitMs: 30_000 })
      expect(screen.getByRole('button', { name: 'Retrying in 0:30' })).toBeTruthy()
    })

    it('does not close on Escape while paused', () => {
      const { props } = renderModal({ run: LINKS_META_RUN, hostBlock: BLOCK })
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(props.onClose).not.toHaveBeenCalled()
      expect(props.onBlockLeave).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
  })
})
