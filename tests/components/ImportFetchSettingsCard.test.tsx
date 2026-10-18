// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import ImportFetchSettingsCard from '@/app/dashboard/config/admin-settings/ImportFetchSettingsCard'

const { mockSave, mockToastSuccess } = vi.hoisted(() => ({
  mockSave: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

vi.mock('@/app/dashboard/config/admin-settings/actions', () => ({ saveImportFetchSettingsAction: mockSave }))
vi.mock('sonner', () => ({ toast: { success: mockToastSuccess } }))

const DEFAULTS = { fetchGapSeconds: 2, retryWaitSeconds: 60, emptyStreakLimit: 3 }

beforeEach(() => {
  vi.clearAllMocks()
  mockSave.mockResolvedValue({ success: true })
})

afterEach(() => cleanup())

const gap = () => screen.getByLabelText(/Same-host gap/)
const wait = () => screen.getByLabelText(/Retry wait/)
const streak = () => screen.getByLabelText(/Empty-fetch limit/)
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }))

describe('ImportFetchSettingsCard', () => {
  it('prefills the current values', () => {
    render(<ImportFetchSettingsCard initialSettings={DEFAULTS} />)
    expect(gap()).toHaveProperty('value', '2')
    expect(wait()).toHaveProperty('value', '60')
    expect(streak()).toHaveProperty('value', '3')
  })

  it('submits the three values and toasts on success', async () => {
    render(<ImportFetchSettingsCard initialSettings={DEFAULTS} />)
    fireEvent.change(gap(), { target: { value: '5' } })
    fireEvent.change(wait(), { target: { value: '30' } })
    fireEvent.change(streak(), { target: { value: '2' } })
    save()

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Saved'))
    expect(mockSave).toHaveBeenCalledWith({ fetchGapSeconds: 5, retryWaitSeconds: 30, emptyStreakLimit: 2 })
  })

  it.each([
    ['gap 31', gap, '31', 'Same-host gap'],
    ['gap 2.5', gap, '2.5', 'Same-host gap'],
    ['empty gap', gap, '', 'Same-host gap'],
    ['wait 601', wait, '601', 'Retry wait'],
    ['streak 0', streak, '0', 'Empty-fetch limit'],
  ])('shows an inline error and does not save for %s', (_label, field, value, message) => {
    render(<ImportFetchSettingsCard initialSettings={DEFAULTS} />)
    fireEvent.change(field(), { target: { value } })
    save()

    expect(screen.getByText(new RegExp(`${message} must be a whole number`))).toBeTruthy()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('shows the server error inline', async () => {
    mockSave.mockResolvedValue({ success: false, error: 'Not authorized' })
    render(<ImportFetchSettingsCard initialSettings={DEFAULTS} />)
    save()

    expect(await screen.findByText('Not authorized')).toBeTruthy()
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })
})
