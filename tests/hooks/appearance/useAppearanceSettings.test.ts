// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAppearanceSettings } from '@/lib/hooks/appearance/useAppearanceSettings'

const mockSetAccentColorAction = vi.hoisted(() => vi.fn())
const mockSetSurfaceFamilyAction = vi.hoisted(() => vi.fn())
const mockSetThemeModeAction = vi.hoisted(() => vi.fn())
const mockSetAccentLight = vi.hoisted(() => vi.fn())
const mockSetAccentDark = vi.hoisted(() => vi.fn())
const mockSetSurfaceFamily = vi.hoisted(() => vi.fn())
const mockSetThemeMode = vi.hoisted(() => vi.fn())

vi.mock('@/app/dashboard/config/appearance/actions', () => ({
  setAccentColorAction: mockSetAccentColorAction,
  setSurfaceFamilyAction: mockSetSurfaceFamilyAction,
  setThemeModeAction: mockSetThemeModeAction,
}))

vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({
    setAccentLight: mockSetAccentLight,
    setAccentDark: mockSetAccentDark,
    setSurfaceFamily: mockSetSurfaceFamily,
    setThemeMode: mockSetThemeMode,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSetAccentColorAction.mockResolvedValue({ success: true })
  mockSetSurfaceFamilyAction.mockResolvedValue({ success: true })
  mockSetThemeModeAction.mockResolvedValue({ success: true })
})

describe('useAppearanceSettings', () => {
  it('initializes light/dark/surface/mode from props and mirrors them to ThemeProvider', () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'violet', initialDark: 'blue', initialSurface: 'zinc', initialMode: 'dark' }),
    )

    expect(result.current.light.value).toBe('violet')
    expect(result.current.dark.value).toBe('blue')
    expect(result.current.surface.value).toBe('zinc')
    expect(result.current.mode.value).toBe('dark')

    expect(mockSetAccentLight).toHaveBeenCalledWith('violet')
    expect(mockSetAccentDark).toHaveBeenCalledWith('blue')
    expect(mockSetSurfaceFamily).toHaveBeenCalledWith('zinc')
    expect(mockSetThemeMode).toHaveBeenCalledWith('dark')
  })

  it('persists a light accent pick via setAccentColorAction and mirrors it to ThemeProvider', async () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'indigo', initialDark: 'indigo', initialSurface: 'slate', initialMode: 'system' }),
    )

    act(() => result.current.light.select('rose'))

    expect(result.current.light.value).toBe('rose')
    await waitFor(() => expect(mockSetAccentColorAction).toHaveBeenCalledWith('light', 'rose'))
    expect(mockSetAccentLight).toHaveBeenCalledWith('rose')
  })

  it('persists a dark accent pick via setAccentColorAction and mirrors it to ThemeProvider', async () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'indigo', initialDark: 'indigo', initialSurface: 'slate', initialMode: 'system' }),
    )

    act(() => result.current.dark.select('emerald'))

    expect(result.current.dark.value).toBe('emerald')
    await waitFor(() => expect(mockSetAccentColorAction).toHaveBeenCalledWith('dark', 'emerald'))
    expect(mockSetAccentDark).toHaveBeenCalledWith('emerald')
  })

  it('persists a surface tone pick via setSurfaceFamilyAction and mirrors it to ThemeProvider', async () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'indigo', initialDark: 'indigo', initialSurface: 'slate', initialMode: 'system' }),
    )

    act(() => result.current.surface.select('teal'))

    expect(result.current.surface.value).toBe('teal')
    await waitFor(() => expect(mockSetSurfaceFamilyAction).toHaveBeenCalledWith('teal'))
    expect(mockSetSurfaceFamily).toHaveBeenCalledWith('teal')
  })

  it('persists a theme mode pick via setThemeModeAction and mirrors it to ThemeProvider', async () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'indigo', initialDark: 'indigo', initialSurface: 'slate', initialMode: 'system' }),
    )

    act(() => result.current.mode.select('dark'))

    expect(result.current.mode.value).toBe('dark')
    await waitFor(() => expect(mockSetThemeModeAction).toHaveBeenCalledWith('dark'))
    expect(mockSetThemeMode).toHaveBeenCalledWith('dark')
  })

  it('rolls back a theme mode pick if setThemeModeAction fails', async () => {
    mockSetThemeModeAction.mockResolvedValueOnce({ success: false, error: 'boom' })

    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'indigo', initialDark: 'indigo', initialSurface: 'slate', initialMode: 'system' }),
    )

    act(() => result.current.mode.select('dark'))

    await waitFor(() => expect(result.current.mode.error).toBe('boom'))
    expect(result.current.mode.value).toBe('system')
  })

  it('reports isResetting true while any of the four picks is still in flight', async () => {
    let resolvePending: (r: { success: true }) => void
    mockSetAccentColorAction.mockReturnValue(
      new Promise(resolve => { resolvePending = resolve }),
    )

    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'indigo', initialDark: 'indigo', initialSurface: 'slate', initialMode: 'system' }),
    )

    act(() => result.current.light.select('rose'))
    expect(result.current.isResetting).toBe(true)

    await act(async () => resolvePending({ success: true }))
    expect(result.current.isResetting).toBe(false)
  })

  it('handleReset restores light/dark to indigo, surface to slate, and mode to system', async () => {
    const { result } = renderHook(() =>
      useAppearanceSettings({ initialLight: 'rose', initialDark: 'blue', initialSurface: 'zinc', initialMode: 'dark' }),
    )

    await act(async () => result.current.handleReset())

    expect(result.current.light.value).toBe('indigo')
    expect(result.current.dark.value).toBe('indigo')
    expect(result.current.surface.value).toBe('slate')
    expect(result.current.mode.value).toBe('system')
    expect(mockSetAccentColorAction).toHaveBeenCalledWith('light', 'indigo')
    expect(mockSetAccentColorAction).toHaveBeenCalledWith('dark', 'indigo')
    expect(mockSetSurfaceFamilyAction).toHaveBeenCalledWith('slate')
    expect(mockSetThemeModeAction).toHaveBeenCalledWith('system')
  })
})
