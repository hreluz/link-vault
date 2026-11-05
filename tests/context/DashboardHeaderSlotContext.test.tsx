// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { DashboardHeaderSlotProvider, useDashboardHeaderSlot } from '@/lib/context/DashboardHeaderSlotContext'
import DashboardHeader from '@/app/dashboard/DashboardHeader'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))
vi.mock('@/app/dashboard/ThemeToggleButton', () => ({ default: () => <button aria-label="Switch to dark mode" /> }))
vi.mock('@/app/dashboard/LogoutButton', () => ({ default: () => <button>Sign out</button> }))

afterEach(() => cleanup())

function SlotProbe() {
  const { slot } = useDashboardHeaderSlot()
  return <span data-testid="probe">{slot ? slot.getAttribute('data-testid') : 'none'}</span>
}

describe('DashboardHeaderSlotContext', () => {
  it('has a null slot outside the provider', () => {
    render(<SlotProbe />)
    expect(screen.getByTestId('probe').textContent).toBe('none')
  })

  it("registers DashboardHeader's slot element", () => {
    render(
      <DashboardHeaderSlotProvider>
        <DashboardHeader userEmail="a@b.dev" />
        <SlotProbe />
      </DashboardHeaderSlotProvider>
    )
    expect(screen.getByTestId('probe').textContent).toBe('dashboard-header-slot')
  })

  it('places the slot directly left of the theme toggle and keeps the other header controls', () => {
    render(
      <DashboardHeaderSlotProvider>
        <DashboardHeader userEmail="a@b.dev" />
      </DashboardHeaderSlotProvider>
    )
    const slot = screen.getByTestId('dashboard-header-slot')
    expect(slot.nextElementSibling?.getAttribute('aria-label')).toBe('Switch to dark mode')
    expect(slot.className).toBe('contents')
    expect(screen.getByRole('button', { name: 'Link Vault, scroll to top' })).toBeTruthy()
    expect(screen.getByText('a@b.dev')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
  })

  it('still renders the header without the provider', () => {
    render(<DashboardHeader userEmail="a@b.dev" />)
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
  })
})
