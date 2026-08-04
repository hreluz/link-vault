// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import ColorFamilyPicker from '@/app/dashboard/config/appearance/ColorFamilyPicker'
import { PRESET_ACCENTS, isPresetAccent, checkAccentContrast } from '@/lib/utils/accentRamp'

function renderPicker(overrides: Partial<React.ComponentProps<typeof ColorFamilyPicker>> = {}) {
  const onSelect = vi.fn()
  const utils = render(
    <ColorFamilyPicker
      label="Light mode accent"
      value="indigo"
      onSelect={onSelect}
      isPending={false}
      error={null}
      presets={PRESET_ACCENTS}
      isPresetValue={isPresetAccent}
      defaultCustomHex="#6366f1"
      contrastWarning={checkAccentContrast}
      {...overrides}
    />,
  )
  return { onSelect, ...utils }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.useRealTimers(); cleanup() })

describe('ColorFamilyPicker', () => {
  it('renders the label, description, and one swatch per preset', () => {
    renderPicker({ description: 'Pick a color' })

    expect(screen.getByText('Light mode accent')).not.toBeNull()
    expect(screen.getByText('Pick a color')).not.toBeNull()
    for (const preset of PRESET_ACCENTS) {
      expect(screen.getByRole('button', { name: preset.label })).not.toBeNull()
    }
  })

  it('calls onSelect with a preset value when its swatch is clicked', () => {
    const { onSelect } = renderPicker()

    fireEvent.click(screen.getByRole('button', { name: 'Violet' }))

    expect(onSelect).toHaveBeenCalledWith('violet')
  })

  it('does not show the custom hex inputs when the active value is a preset', () => {
    renderPicker({ value: 'indigo' })

    expect(screen.queryByPlaceholderText('#6366f1')).toBeNull()
  })

  it('shows the custom hex inputs pre-filled when the active value is already a custom hex', () => {
    renderPicker({ value: '#ff8800' })

    const textInput = screen.getByPlaceholderText('#6366f1') as HTMLInputElement
    expect(textInput.value).toBe('#ff8800')
  })

  it('opens the custom hex inputs when the custom-color swatch is clicked', () => {
    renderPicker({ value: 'indigo' })

    fireEvent.click(screen.getByRole('button', { name: 'Custom color' }))

    expect(screen.getByPlaceholderText('#6366f1')).not.toBeNull()
  })

  it('debounces a valid hex entry before calling onSelect', () => {
    const { onSelect } = renderPicker({ value: '#123456' })

    const textInput = screen.getByPlaceholderText('#6366f1')
    fireEvent.change(textInput, { target: { value: '#abcdef' } })

    expect(onSelect).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(150))

    expect(onSelect).toHaveBeenCalledWith('#abcdef')
  })

  it('never calls onSelect for an incomplete or invalid hex', () => {
    const { onSelect } = renderPicker({ value: '#123456' })

    const textInput = screen.getByPlaceholderText('#6366f1')
    fireEvent.change(textInput, { target: { value: '#12' } })
    act(() => vi.advanceTimersByTime(500))

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('shows a contrast warning when contrastWarning reports insufficient contrast', () => {
    renderPicker({ value: '#ffffff', contrastWarning: () => false })

    expect(screen.getByText(/hard to read/i)).not.toBeNull()
  })

  it('does not show a contrast warning when contrastWarning reports sufficient contrast', () => {
    renderPicker({ value: '#111111', contrastWarning: () => true })

    expect(screen.queryByText(/hard to read/i)).toBeNull()
  })

  it('does not show a contrast warning when no contrastWarning function is supplied', () => {
    renderPicker({ value: '#ffffff', contrastWarning: undefined })

    expect(screen.queryByText(/hard to read/i)).toBeNull()
  })

  it('renders the error message when one is passed', () => {
    renderPicker({ error: 'Invalid accent color' })

    expect(screen.getByText('Invalid accent color')).not.toBeNull()
  })

  it('disables preset and custom-color buttons while pending', () => {
    renderPicker({ isPending: true })

    expect(screen.getByRole('button', { name: 'Indigo' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Custom color' })).toHaveProperty('disabled', true)
  })
})
