'use client'

import { useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'

/**
 * Reconciles the DB-stored accent/surface preferences into the shared
 * ThemeProvider context once the dashboard mounts, overwriting any
 * stale/absent localStorage cache (e.g. a preference changed on another
 * device).
 */
export default function AccentSync({
  light,
  dark,
  surface,
}: {
  light: string
  dark: string
  surface: string
}) {
  const { setAccentLight, setAccentDark, setSurfaceFamily } = useTheme()

  useEffect(() => {
    setAccentLight(light)
    setAccentDark(dark)
    setSurfaceFamily(surface)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [light, dark, surface])

  return null
}
