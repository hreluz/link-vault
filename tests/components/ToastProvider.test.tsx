// @vitest-environment jsdom
// SPEC 35: ToastProvider toasts are announced, clickable ones are real buttons,
// and the mobile stack sits above the bottom nav plus the safe-area inset.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { ToastProvider, useToast } from '@/components/ToastProvider'

afterEach(cleanup)

function Trigger({ onClick }: { onClick?: () => void }) {
  const { addToast } = useToast()
  return <button onClick={() => addToast('Hello', 'default', { onClick })}>show</button>
}

function show(onClick?: () => void) {
  render(<ToastProvider><Trigger onClick={onClick} /></ToastProvider>)
  act(() => { fireEvent.click(screen.getByText('show')) })
}

describe('ToastProvider', () => {
  it('announces toasts politely', () => {
    show()

    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.textContent).toContain('Hello')
  })

  it('renders a clickable toast as a button the keyboard can reach', () => {
    const onClick = vi.fn()
    show(onClick)

    const button = screen.getByRole('button', { name: 'Hello' })
    expect(button.tabIndex).toBe(0)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a plain toast as text, not a button', () => {
    show()

    expect(screen.queryByRole('button', { name: 'Hello' })).toBeNull()
  })

  it('offsets the mobile stack by the safe-area inset', () => {
    show()

    expect(screen.getByRole('status').className).toContain('bottom-[calc(6rem+env(safe-area-inset-bottom))]')
  })
})
