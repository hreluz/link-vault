// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import HeaderUndoButton from '@/app/dashboard/link/HeaderUndoButton'

const mockUseLinkListContext = vi.fn()
vi.mock('@/app/dashboard/link/LinkListContext', () => ({
  useLinkListContext: () => mockUseLinkListContext(),
}))

let slotEl: HTMLElement | null = null
vi.mock('@/lib/context/DashboardHeaderSlotContext', () => ({
  useDashboardHeaderSlot: () => ({ slot: slotEl, setSlot: vi.fn() }),
}))

const handleUndoMove = vi.fn()
const movedLink = { id: 'l1', title: 'Cool video', url: 'https://example.com/v' }

function setContext(overrides: Record<string, unknown> = {}) {
  mockUseLinkListContext.mockReturnValue({
    lastMovedLink: movedLink,
    undoingMove: false,
    handleUndoMove,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  slotEl = document.createElement('div')
  slotEl.setAttribute('data-testid', 'slot')
  document.body.appendChild(slotEl)
  setContext()
})

afterEach(() => {
  cleanup()
  document.querySelectorAll('[data-testid="slot"]').forEach(el => el.remove())
})

const undoButton = () => screen.getByRole('button', { name: 'Undo last move' }) as HTMLButtonElement

describe('HeaderUndoButton', () => {
  it('renders nothing without a header slot', () => {
    slotEl = null
    render(<HeaderUndoButton />)
    expect(screen.queryByRole('button', { name: 'Undo last move' })).toBeNull()
  })

  it('renders nothing when there is no move to undo', () => {
    setContext({ lastMovedLink: null })
    render(<HeaderUndoButton />)
    expect(screen.queryByRole('button', { name: 'Undo last move' })).toBeNull()
  })

  it('portals into the header slot, not where it is rendered', () => {
    const { container } = render(<HeaderUndoButton />)
    expect(screen.getByTestId('slot').contains(undoButton())).toBe(true)
    expect(container.contains(undoButton())).toBe(false)
  })

  it('is icon-only with the aria-label and the moved link title', () => {
    render(<HeaderUndoButton />)
    expect(undoButton().textContent).toBe('')
    expect(undoButton().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(undoButton().getAttribute('title')).toBe('Move Cool video back')
  })

  it('falls back to the display title when the link has no title', () => {
    setContext({ lastMovedLink: { ...movedLink, title: null, url: 'https://www.instagram.com/reel/abc/' } })
    render(<HeaderUndoButton />)
    expect(undoButton().getAttribute('title')).toBe('Move reel/abc back')
  })

  it('calls handleUndoMove on click', () => {
    render(<HeaderUndoButton />)
    fireEvent.click(undoButton())
    expect(handleUndoMove).toHaveBeenCalledOnce()
  })

  it('is disabled while the undo is saving', () => {
    setContext({ undoingMove: true })
    render(<HeaderUndoButton />)
    expect(undoButton().disabled).toBe(true)
  })

  it('has the 44px touch target (36px from sm) and the focus ring', () => {
    render(<HeaderUndoButton />)
    const cls = undoButton().className
    expect(cls).toContain('h-11 w-11')
    expect(cls).toContain('sm:h-9 sm:w-9')
    expect(cls).toContain('focus-ring')
  })
})
