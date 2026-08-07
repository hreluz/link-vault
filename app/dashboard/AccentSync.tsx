'use client'

import { useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import type { ThemeMode } from '@/lib/types/database'

/**
 * Reconciles the DB-stored accent/surface/theme-mode preferences into the
 * shared ThemeProvider context once the dashboard mounts, overwriting any
 * stale/absent localStorage cache (e.g. a preference changed on another
 * device).
 */
export default function AccentSync({
  light,
  dark,
  surface,
  mode,
}: {
  light: string
  dark: string
  surface: string
  mode: ThemeMode
}) {
  const { setAccentLight, setAccentDark, setSurfaceFamily, setThemeMode } = useTheme()

  useEffect(() => {
    setAccentLight(light)
    setAccentDark(dark)
    setSurfaceFamily(surface)
    setThemeMode(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [light, dark, surface, mode])

  return null
}
