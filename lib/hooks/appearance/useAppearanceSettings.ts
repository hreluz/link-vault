import { useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { useAsyncSelect } from '@/lib/hooks/useAsyncSelect'
import { setAccentColorAction, setSurfaceFamilyAction } from '@/app/dashboard/config/appearance/actions'
import type { AccentColor, SurfaceFamily } from '@/lib/types/database'

export function useAppearanceSettings({
  initialLight,
  initialDark,
  initialSurface,
}: {
  initialLight: string
  initialDark: string
  initialSurface: SurfaceFamily
}) {
  const { setAccentLight, setAccentDark, setSurfaceFamily } = useTheme()

  const light = useAsyncSelect(initialLight, (accent: AccentColor) => setAccentColorAction('light', accent))
  const dark = useAsyncSelect(initialDark, (accent: AccentColor) => setAccentColorAction('dark', accent))
  const surface = useAsyncSelect(initialSurface, (family: SurfaceFamily) => setSurfaceFamilyAction(family))

  useEffect(() => {
    setAccentLight(light.value)
  }, [light.value, setAccentLight])

  useEffect(() => {
    setAccentDark(dark.value)
  }, [dark.value, setAccentDark])

  useEffect(() => {
    setSurfaceFamily(surface.value)
  }, [surface.value, setSurfaceFamily])

  const isResetting = light.isPending || dark.isPending || surface.isPending

  function handleReset() {
    light.select('indigo')
    dark.select('indigo')
    surface.select('slate')
  }

  return { light, dark, surface, isResetting, handleReset }
}
