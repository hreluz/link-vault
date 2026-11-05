// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import LinkPreferencesForm from '@/app/dashboard/config/link-preferences/LinkPreferencesForm'

const { mockSave, mockToggle, mockReset, mockToastSuccess } = vi.hoisted(() => ({
  mockSave: vi.fn(),
  mockToggle: vi.fn(),
  mockReset: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

vi.mock('@/app/dashboard/config/link-preferences/actions', () => ({
  saveMoveToEndDelayAction: mockSave,
  toggleAutoFetchPreferenceAction: mockToggle,
  resetLinkOrderAction: mockReset,
}))
vi.mock('sonner', () => ({ toast: { success: mockToastSuccess } }))

beforeEach(() => {
  vi.clearAllMocks()
  mockSave.mockResolvedValue({ success: true })
})

afterEach(() => cleanup())

function setup(seconds = 30) {
  render(<LinkPreferencesForm initialAutoFetchEnabled initialMoveToEndDelaySeconds={seconds} />)
}
const input = () => screen.getByLabelText(/Move opened links to the end after/) as HTMLInputElement
const type = (value: string) => fireEvent.change(input(), { target: { value } })
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }))

describe('LinkPreferencesForm move-to-end delay', () => {
  it('shows the initial value', () => {
    setup(45)
    expect(input().value).toBe('45')
  })

  it.each(['4', '601', '30.5', ''])('rejects %j and saves nothing', value => {
    setup()
    type(value)
    save()
    expect(screen.getByText(/whole number from 5 to 600/)).toBeTruthy()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('saves a valid value as a number and shows Saved', async () => {
    setup()
    type('5')
    save()
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Saved'))
    expect(mockSave).toHaveBeenCalledExactlyOnceWith(5)
  })

  it('shows the error of a failed save', async () => {
    mockSave.mockResolvedValue({ success: false, error: 'Not authenticated' })
    setup()
    save()
    expect(await screen.findByText('Not authenticated')).toBeTruthy()
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })
})

describe('LinkPreferencesForm reset link order', () => {
  const resetButton = () => screen.queryByRole('button', { name: 'Reset link order' })
  const confirmButton = () => screen.getByRole('button', { name: 'Reset' })
  const openConfirm = () => fireEvent.click(resetButton()!)

  it('shows the Link order section', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Link order' })).toBeTruthy()
    expect(resetButton()).toBeTruthy()
  })

  it('asks for confirmation and does nothing until confirmed', () => {
    setup()
    openConfirm()
    expect(screen.getByText(/can't be restored/)).toBeTruthy()
    expect(resetButton()).toBeNull()
    expect(mockReset).not.toHaveBeenCalled()
  })

  it('can be cancelled without resetting', () => {
    setup()
    openConfirm()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(resetButton()).toBeTruthy()
    expect(mockReset).not.toHaveBeenCalled()
  })

  it('resets and shows the number of links reset', async () => {
    mockReset.mockResolvedValue({ success: true, count: 3 })
    setup()
    openConfirm()
    fireEvent.click(confirmButton())
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Reset 3 links'))
    expect(mockReset).toHaveBeenCalledOnce()
    await waitFor(() => expect(resetButton()).toBeTruthy())
  })

  it('uses the singular for one link', async () => {
    mockReset.mockResolvedValue({ success: true, count: 1 })
    setup()
    openConfirm()
    fireEvent.click(confirmButton())
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Reset 1 link'))
  })

  it('says when there was nothing to reset', async () => {
    mockReset.mockResolvedValue({ success: true, count: 0 })
    setup()
    openConfirm()
    fireEvent.click(confirmButton())
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('No moved links to reset'))
  })

  it('shows the error of a failed reset and keeps the confirm step', async () => {
    mockReset.mockResolvedValue({ success: false, error: 'Network error' })
    setup()
    openConfirm()
    fireEvent.click(confirmButton())
    expect(await screen.findByText('Network error')).toBeTruthy()
    expect(mockToastSuccess).not.toHaveBeenCalled()
    await waitFor(() => expect(confirmButton()).toBeTruthy())
  })
})
