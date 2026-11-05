// @vitest-environment jsdom
// SPEC 35: BottomSheet, FilterSheet and UnlockTagModal behave as real dialogs
// (named by their heading, Escape closes, Tab is trapped, focus goes back).
import React, { useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import BottomSheet from '@/app/dashboard/link/BottomSheet'
import FilterSheet from '@/app/dashboard/link/FilterSheet'
import UnlockTagModal from '@/components/UnlockTagModal'
import type { LinkWithTags } from '@/lib/services/links'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }))
vi.mock('@/lib/services/tags/privateTagSecurity', () => ({
  getPrivateTagSettings: vi.fn().mockResolvedValue({ hint: null }),
  verifyPrivateTagPassword: vi.fn(),
}))

afterEach(() => {
  cleanup()
  delete (window as { matchMedia?: unknown }).matchMedia
})

const LINK: LinkWithTags = {
  id: '1', user_id: 'user-1', url: 'https://alpha.com', title: 'Alpha Article',
  description: null, site_name: 'alpha.com', image_url: null, duration: null, notes: null,
  category_id: null, status: 'read', is_favorite: false, tags: [],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, moved_to_end_at: null,
}

const FILTER_PROPS = {
  sortBy: 'newest' as const, category: 'all', categories: [],
  selectedTagIds: [], tagMode: 'any' as const, allTags: [{ id: 't1', name: 'react' }], resultCount: 3,
  onSortChange: vi.fn(), onCategoryChange: vi.fn(), onTagsChange: vi.fn(), onTagModeChange: vi.fn(),
  onReset: vi.fn(),
}

type Sheet = (open: boolean, close: () => void) => React.ReactNode

const SHEETS: [string, string, Sheet][] = [
  ['BottomSheet', 'Alpha Article', (open, close) => (
    <BottomSheet link={open ? LINK : null} onStatusChange={vi.fn()} onClose={close} />
  )],
  ['FilterSheet', 'Filters & Sort', (open, close) => (
    <FilterSheet {...FILTER_PROPS} isOpen={open} onClose={close} />
  )],
  ['UnlockTagModal', 'Unlock private tags', (open, close) => (
    open ? <UnlockTagModal onUnlock={vi.fn()} onClose={close} /> : null
  )],
]

function Harness({ sheet, onClose }: { sheet: Sheet; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button data-testid="opener" onClick={() => setOpen(true)}>Open</button>
      {sheet(open, () => { onClose(); setOpen(false) })}
    </>
  )
}

function openSheet(sheet: Sheet) {
  const onClose = vi.fn()
  render(<Harness sheet={sheet} onClose={onClose} />)
  const opener = screen.getByTestId('opener')
  opener.focus()
  fireEvent.click(opener)
  return { onClose, opener }
}

describe.each(SHEETS)('%s as a dialog', (_, heading, sheet) => {
  it('is announced as a modal dialog named by its heading', () => {
    openSheet(sheet)

    const dialog = screen.getByRole('dialog', { name: heading })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('closes on Escape and returns focus to its opener', () => {
    const { onClose, opener } = openSheet(sheet)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('traps Tab inside the dialog', () => {
    openSheet(sheet)
    const dialog = screen.getByRole('dialog')
    const buttons = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input'))
    const first = buttons[0]
    const last = buttons[buttons.length - 1]

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('pads its bottom by the safe-area inset on mobile', () => {
    openSheet(sheet)

    expect(screen.getByRole('dialog').className).toContain('pb-[max(1rem,env(safe-area-inset-bottom))]')
  })
})

describe('BottomSheet Close button', () => {
  it('is shown at every breakpoint, 44px on mobile, and closes the sheet', () => {
    const { onClose } = openSheet(SHEETS[0][2])

    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.className).not.toMatch(/(^|\s)hidden(\s|$)/)
    expect(close.className).toContain('h-11')
    expect(close.className).toContain('w-11')
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('hides the decorative drag handle from assistive tech', () => {
    openSheet(SHEETS[0][2])

    const handle = screen.getByRole('dialog').firstElementChild as HTMLElement
    expect(handle.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('UnlockTagModal focus and labelling', () => {
  function stubPointer(coarse: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({ matches: coarse }) as unknown as typeof window.matchMedia
  }

  it('gives the password input an accessible name', () => {
    openSheet(SHEETS[2][2])

    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password')
  })

  it('focuses the password input with a fine pointer', () => {
    stubPointer(false)
    openSheet(SHEETS[2][2])

    expect(document.activeElement).toBe(screen.getByLabelText('Password'))
  })

  it("focuses the panel, not the input, on touch screens so the keyboard doesn't pop up", () => {
    stubPointer(true)
    openSheet(SHEETS[2][2])

    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('hides the lock icon from assistive tech', () => {
    openSheet(SHEETS[2][2])

    expect(screen.getByRole('dialog').querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })
})
