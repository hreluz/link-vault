// @vitest-environment jsdom
import React, { useState } from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import EditLinkModal from '@/app/dashboard/link/EditLinkModal'
import type { LinkWithTags } from '@/lib/services/links'
import { makeLink } from '../hooks/collections/fixtures'

vi.mock('@/lib/hooks/links', () => ({
  useEditLinkForm: () => ({ hasChanges: false, submitting: false, handleSubmit: vi.fn(), savedCollectionIds: () => null }),
}))
vi.mock('@/lib/hooks/categories/useCategoryList', () => ({ useCategoryList: () => ({ categories: [] }) }))
vi.mock('@/app/dashboard/link/LinkForm', () => ({ default: () => <input aria-label="Title" data-autofocus /> }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

beforeEach(() => {
  if (!globalThis.CSS?.escape) (globalThis as { CSS?: unknown }).CSS = { escape: (s: string) => s }
})
afterEach(cleanup)

/** A card with an Edit button that can be unmounted while the modal is open, plus a fallback input. */
function Harness({ withFallback }: { withFallback: boolean }) {
  const link = makeLink('a')
  const [editing, setEditing] = useState<LinkWithTags | null>(null)
  const [cardShown, setCardShown] = useState(true)
  return (
    <>
      <input aria-label="Search this collection" />
      {cardShown && <button data-link-edit="a" onClick={() => setEditing(link)}>Edit</button>}
      <button onClick={() => setCardShown(false)}>hide card</button>
      <EditLinkModal
        link={editing}
        onSave={vi.fn()}
        onClose={() => setEditing(null)}
        fallbackFocus={withFallback ? () => screen.getByLabelText('Search this collection') : undefined}
      />
    </>
  )
}

function openThenHideCardThenClose() {
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
  expect(screen.getByRole('dialog')).toBeTruthy()
  act(() => screen.getByRole('button', { name: 'hide card', hidden: true }).click())
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
}

describe('EditLinkModal focus on close', () => {
  it('returns focus to the card’s Edit button when it is still there', () => {
    render(<Harness withFallback />)
    const edit = screen.getByRole('button', { name: 'Edit' })
    edit.focus()
    fireEvent.click(edit)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).toBe(edit)
  })

  it('falls back to fallbackFocus when the Edit button is gone', () => {
    render(<Harness withFallback />)
    screen.getByRole('button', { name: 'Edit' }).focus()
    openThenHideCardThenClose()
    expect(document.activeElement).toBe(screen.getByLabelText('Search this collection'))
  })

  it('leaves focus alone without a fallback (dashboard behaviour)', () => {
    render(<Harness withFallback={false} />)
    screen.getByRole('button', { name: 'Edit' }).focus()
    openThenHideCardThenClose()
    expect(document.activeElement).not.toBe(screen.getByLabelText('Search this collection'))
  })
})
