// @vitest-environment jsdom

import React, { useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, act } from '@testing-library/react'
import { useDialog } from '@/lib/hooks/shared/useDialog'

interface HarnessProps {
  onClose?: () => void
  returnFocus?: () => HTMLElement | null
  autofocus?: boolean
  removeOpenerOnOpen?: boolean
}

// An opener button plus a dialog with: a field, a disabled button and a last button.
function Harness({ onClose = () => {}, returnFocus, autofocus = true, removeOpenerOnOpen = false }: HarnessProps) {
  const [open, setOpen] = useState(false)
  const dialog = useDialog({ isOpen: open, onClose: () => { onClose(); setOpen(false) }, returnFocus })
  return (
    <>
      {!(open && removeOpenerOnOpen) && <button data-testid="opener" onClick={() => setOpen(true)}>Open</button>}
      <button data-testid="fallback">Fallback</button>
      {open && (
        <div data-testid="panel" {...dialog.dialogProps}>
          <h2 id={dialog.titleId}>My dialog</h2>
          <input data-testid="first" />
          <input data-testid="field" data-autofocus={autofocus || undefined} />
          <button data-testid="disabled" disabled>Disabled</button>
          <button data-testid="last" onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </>
  )
}

function setup(props: HarnessProps = {}) {
  const utils = render(<Harness {...props} />)
  const opener = utils.getByTestId('opener')
  opener.focus()
  fireEvent.click(opener)
  return { ...utils, opener }
}

function stubPointer(coarse: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: coarse }) as unknown as typeof window.matchMedia
}

describe('useDialog', () => {
  afterEach(() => {
    cleanup()
    // jsdom has no matchMedia; don't leak a stub between tests.
    delete (window as { matchMedia?: unknown }).matchMedia
  })

  it('marks the panel as a modal dialog named by its heading', () => {
    const { getByRole } = setup()
    const dialog = getByRole('dialog', { name: 'My dialog' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('focuses the [data-autofocus] element on open', () => {
    const { getByTestId } = setup()
    expect(document.activeElement).toBe(getByTestId('field'))
  })

  it('focuses the panel when nothing is marked [data-autofocus]', () => {
    const { getByTestId } = setup({ autofocus: false })
    expect(document.activeElement).toBe(getByTestId('panel'))
  })

  it('focuses the panel instead of a field on touch screens', () => {
    stubPointer(true)
    const { getByTestId } = setup()
    expect(document.activeElement).toBe(getByTestId('panel'))
  })

  it('focuses the [data-autofocus] element with a fine pointer', () => {
    stubPointer(false)
    const { getByTestId } = setup()
    expect(document.activeElement).toBe(getByTestId('field'))
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    setup({ onClose })
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores an Escape a child already handled', () => {
    const onClose = vi.fn()
    const { getByTestId } = setup({ onClose })
    const field = getByTestId('field')
    field.addEventListener('keydown', e => e.preventDefault())
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ignores Escape while closed', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('wraps Tab from the last element to the first, skipping disabled buttons', () => {
    const { getByTestId } = setup()
    getByTestId('last').focus()
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(document.activeElement).toBe(getByTestId('first'))
  })

  it('wraps Shift+Tab from the first element to the last', () => {
    const { getByTestId } = setup()
    getByTestId('first').focus()
    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(getByTestId('last'))
  })

  it('leaves Tab between inner elements to the browser', () => {
    const { getByTestId } = setup()
    getByTestId('first').focus()
    const event = fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(event).toBe(true) // not preventDefault-ed
    expect(document.activeElement).toBe(getByTestId('first'))
  })

  it('brings focus back inside when Tab is pressed with focus outside the panel', () => {
    const { getByTestId } = setup()
    act(() => { (document.activeElement as HTMLElement).blur() })
    fireEvent.keyDown(document.body, { key: 'Tab' })
    expect(document.activeElement).toBe(getByTestId('first'))
  })

  it('returns focus to the opener on close', () => {
    const { getByTestId, opener } = setup()
    fireEvent.click(getByTestId('last'))
    expect(document.activeElement).toBe(opener)
  })

  it('uses returnFocus when the opener is gone', () => {
    let fallback: HTMLElement | null = null
    const { getByTestId } = setup({ removeOpenerOnOpen: true, returnFocus: () => fallback })
    fallback = getByTestId('fallback')
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(document.activeElement).toBe(fallback)
  })
})
