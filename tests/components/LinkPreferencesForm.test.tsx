// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import LinkPreferencesForm from '@/app/dashboard/config/link-preferences/LinkPreferencesForm'

const { mockSave, mockToggle, mockToastSuccess } = vi.hoisted(() => ({
  mockSave: vi.fn(),
  mockToggle: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

vi.mock('@/app/dashboard/config/link-preferences/actions', () => ({
  saveMoveToEndDelayAction: mockSave,
  toggleAutoFetchPreferenceAction: mockToggle,
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
