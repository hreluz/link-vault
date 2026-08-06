import { useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { useAsyncSelect } from '@/lib/hooks/useAsyncSelect'
import { setAccentColorAction, setSurfaceFamilyAction, setThemeModeAction } from '@/app/dashboard/config/appearance/actions'
import type { AccentColor, SurfaceFamily, ThemeMode } from '@/lib/types/database'

export function useAppearanceSettings({
  initialLight,
  initialDark,
  initialSurface,
  initialMode,
}: {
  initialLight: string
  initialDark: string
  initialSurface: SurfaceFamily
  initialMode: ThemeMode
}) {
  const { setAccentLight, setAccentDark, setSurfaceFamily, setThemeMode } = useTheme()

  const light = useAsyncSelect(initialLight, (accent: AccentColor) => setAccentColorAction('light', accent))
  const dark = useAsyncSelect(initialDark, (accent: AccentColor) => setAccentColorAction('dark', accent))
  const surface = useAsyncSelect(initialSurface, (family: SurfaceFamily) => setSurfaceFamilyAction(family))
  const mode = useAsyncSelect(initialMode, (next: ThemeMode) => setThemeModeAction(next))

  useEffect(() => {
    setAccentLight(light.value)
  }, [light.value, setAccentLight])

  useEffect(() => {
    setAccentDark(dark.value)
  }, [dark.value, setAccentDark])

  useEffect(() => {
    setSurfaceFamily(surface.value)
  }, [surface.value, setSurfaceFamily])

  useEffect(() => {
    setThemeMode(mode.value)
  }, [mode.value, setThemeMode])

  const isResetting = light.isPending || dark.isPending || surface.isPending || mode.isPending

  function handleReset() {
    light.select('indigo')
    dark.select('indigo')
    surface.select('slate')
    mode.select('system')
  }

  return { light, dark, surface, mode, isResetting, handleReset }
}
