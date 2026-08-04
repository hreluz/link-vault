// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAppearanceSettings } from '@/lib/hooks/appearance/useAppearanceSettings'

const mockSetAccentColorAction = vi.hoisted(() => vi.fn())
const mockSetSurfaceFamilyAction = vi.hoisted(() => vi.fn())
const mockSetAccentLight = vi.hoisted(() => vi.fn())
const mockSetAccentDark = vi.hoisted(() => vi.fn())
const mockSetSurfaceFamily = vi.hoisted(() => vi.fn())

vi.mock('@/app/dashboard/config/appearance/actions', () => ({
  setAccentColorAction: mockSetAccentColorAction,
  setSurfaceFamilyAction: mockSetSurfaceFamilyAction,
}))

vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({
    setAccentLight: mockSetAccentLight,
    setAccentDark: mockSetAccentDark,
    setSurfaceFamily: mockSetSurfaceFamily,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSetAccentColorAction.mockResolvedValue({ success: true })
  mockSetSurfaceFamilyAction.mockResolvedValue({ success: true })
})

describe('useAppearanceSettings', () => {
  it('initializes light/dark/surface from props and mirrors them to ThemeProvider', () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'violet', initialDark: 'blue', initialSurface: 'zinc' }),
    )

    expect(result.current.light.value).toBe('violet')
    expect(result.current.dark.value).toBe('blue')
    expect(result.current.surface.value).toBe('zinc')

    expect(mockSetAccentLight).toHaveBeenCalledWith('violet')
    expect(mockSetAccentDark).toHaveBeenCalledWith('blue')
    expect(mockSetSurfaceFamily).toHaveBeenCalledWith('zinc')
  })

  it('persists a light accent pick via setAccentColorAction and mirrors it to ThemeProvider', async () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'indigo', initialDark: 'indigo', initialSurface: 'slate' }),
    )

    act(() => result.current.light.select('rose'))

    expect(result.current.light.value).toBe('rose')
    await waitFor(() => expect(mockSetAccentColorAction).toHaveBeenCalledWith('light', 'rose'))
    expect(mockSetAccentLight).toHaveBeenCalledWith('rose')
  })

  it('persists a dark accent pick via setAccentColorAction and mirrors it to ThemeProvider', async () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'indigo', initialDark: 'indigo', initialSurface: 'slate' }),
    )

    act(() => result.current.dark.select('emerald'))

    expect(result.current.dark.value).toBe('emerald')
    await waitFor(() => expect(mockSetAccentColorAction).toHaveBeenCalledWith('dark', 'emerald'))
    expect(mockSetAccentDark).toHaveBeenCalledWith('emerald')
  })

  it('persists a surface tone pick via setSurfaceFamilyAction and mirrors it to ThemeProvider', async () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'indigo', initialDark: 'indigo', initialSurface: 'slate' }),
    )

    act(() => result.current.surface.select('teal'))

    expect(result.current.surface.value).toBe('teal')
    await waitFor(() => expect(mockSetSurfaceFamilyAction).toHaveBeenCalledWith('teal'))
    expect(mockSetSurfaceFamily).toHaveBeenCalledWith('teal')
  })

  it('reports isResetting true while any of the three picks is still in flight', async () => {
    let resolvePending: (r: { success: true }) => void
    mockSetAccentColorAction.mockReturnValue(
      new Promise(resolve => { resolvePending = resolve }),
    )

    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'indigo', initialDark: 'indigo', initialSurface: 'slate' }),
    )

    act(() => result.current.light.select('rose'))
    expect(result.current.isResetting).toBe(true)

    await act(async () => resolvePending({ success: true }))
    expect(result.current.isResetting).toBe(false)
  })

  it('handleReset restores light/dark to indigo and surface to slate', async () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'rose', initialDark: 'blue', initialSurface: 'zinc' }),
    )

    await act(async () => result.current.handleReset())

    expect(result.current.light.value).toBe('indigo')
    expect(result.current.dark.value).toBe('indigo')
    expect(result.current.surface.value).toBe('slate')
    expect(mockSetAccentColorAction).toHaveBeenCalledWith('light', 'indigo')
    expect(mockSetAccentColorAction).toHaveBeenCalledWith('dark', 'indigo')
    expect(mockSetSurfaceFamilyAction).toHaveBeenCalledWith('slate')
  })
})
