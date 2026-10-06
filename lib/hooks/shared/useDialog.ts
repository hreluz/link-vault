'use client'

import { useEffect, useId, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => el.checkVisibility?.() ?? true)
}

interface Options {
  isOpen: boolean
  onClose: () => void
  // Where focus goes on close when the element that had it at open time is gone
  // (e.g. Edit is opened from a bottom-sheet button that unmounts as it opens).
  returnFocus?: () => HTMLElement | null
}

// Gives a modal panel dialog semantics and keyboard behaviour: it's announced as a
// dialog named by its heading, Escape closes it, focus moves in on open (to the
// [data-autofocus] element, or the panel itself on touch screens so the on-screen
// keyboard doesn't pop up), Tab cycles inside it, and focus goes back on close.
export function useDialog({ isOpen, onClose, returnFocus }: Options) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  // Read through refs so a new onClose/returnFocus each render doesn't re-run the
  // open effect, which would steal focus back on every keystroke.
  const onCloseRef = useRef(onClose)
  const returnFocusRef = useRef(returnFocus)
  useEffect(() => {
    onCloseRef.current = onClose
    returnFocusRef.current = returnFocus
  })

  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    const active = document.activeElement
    const opener = active instanceof HTMLElement && active !== document.body ? active : null

    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
    const initial = coarsePointer ? panel : panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel
    initial?.focus()

    function onKeyDown(e: KeyboardEvent) {
      // A child that already handled Escape (e.g. closing tag suggestions) marks it
      // defaultPrevented; that keypress isn't meant for the dialog.
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return

      const items = focusableIn(panel)
      const current = document.activeElement
      if (items.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (!panel.contains(current)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (e.shiftKey && (current === first || current === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const target = opener?.isConnected ? opener : returnFocusRef.current?.()
      target?.focus()
    }
  }, [isOpen])

  return {
    panelRef,
    titleId,
    dialogProps: {
      ref: panelRef,
      role: 'dialog' as const,
      'aria-modal': true,
      'aria-labelledby': titleId,
      tabIndex: -1,
    },
  }
}
