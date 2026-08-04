'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { generateAccentRamp, isPresetAccent, SHADE_KEYS } from '@/lib/utils/accentRamp'
import { generateSurfaceRamp, isSurfaceFamily, SURFACE_SHADE_KEYS } from '@/lib/utils/surfaceFamilies'

type Theme = 'light' | 'dark'

function applyAccent(value: string) {
  const html = document.documentElement
  if (isPresetAccent(value)) {
    html.dataset.accent = value
    for (const shade of SHADE_KEYS) html.style.removeProperty(`--color-primary-${shade}`)
  } else {
    html.dataset.accent = 'custom'
    const ramp = generateAccentRamp(value)
    for (const shade of SHADE_KEYS) html.style.setProperty(`--color-primary-${shade}`, ramp[shade])
  }
}

function applySurface(value: string) {
  const html = document.documentElement
  if (isSurfaceFamily(value)) {
    html.dataset.surface = value
    for (const shade of SURFACE_SHADE_KEYS) html.style.removeProperty(`--color-surface-${shade}`)
    html.style.removeProperty('--color-surface-card')
  } else {
    html.dataset.surface = 'custom'
    const ramp = generateSurfaceRamp(value)
    for (const shade of SURFACE_SHADE_KEYS) html.style.setProperty(`--color-surface-${shade}`, ramp[shade])
    html.style.setProperty('--color-surface-card', ramp.card)
  }
}

function readStoredAccent(key: string): string {
  if (typeof window === 'undefined') return 'indigo'
  return localStorage.getItem(key) ?? 'indigo'
}

function readStoredSurface(): string {
  if (typeof window === 'undefined') return 'slate'
  return localStorage.getItem('surface_family') ?? 'slate'
}

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
  accentLight: string
  accentDark: string
  setAccentLight: (accent: string) => void
  setAccentDark: (accent: string) => void
  surfaceFamily: string
  setSurfaceFamily: (family: string) => void
}>({
  theme: 'light',
  toggleTheme: () => {},
  accentLight: 'indigo',
  accentDark: 'indigo',
  setAccentLight: () => {},
  setAccentDark: () => {},
  surfaceFamily: 'slate',
  setSurfaceFamily: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
  const [accentLight, setAccentLightState] = useState(() => readStoredAccent('accent_light'))
  const [accentDark, setAccentDarkState] = useState(() => readStoredAccent('accent_dark'))
  const [surfaceFamily, setSurfaceFamilyState] = useState(() => readStoredSurface())
  // The inline bootstrap script in app/layout.tsx already applies the
  // correct theme/accent/surface before first paint from the same
  // localStorage values read above — skip re-applying on the very first
  // effect run so we don't needlessly re-touch the DOM with what's already
  // painted.
  const didMount = useRef(false)
  const didMountSurface = useRef(false)

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    applyAccent(theme === 'dark' ? accentDark : accentLight)
  }, [theme, accentLight, accentDark])

  useEffect(() => {
    if (!didMountSurface.current) {
      didMountSurface.current = true
      return
    }
    applySurface(surfaceFamily)
  }, [surfaceFamily])

  function toggleTheme() {
    const html = document.documentElement
    html.classList.add('theme-switching')
    setTimeout(() => html.classList.remove('theme-switching'), 300)
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      html.classList.toggle('dark', next === 'dark')
      localStorage.setItem('theme', next)
      return next
    })
  }

  function setAccentLight(next: string) {
    localStorage.setItem('accent_light', next)
    setAccentLightState(next)
  }

  function setAccentDark(next: string) {
    localStorage.setItem('accent_dark', next)
    setAccentDarkState(next)
  }

  function setSurfaceFamily(next: string) {
    localStorage.setItem('surface_family', next)
    setSurfaceFamilyState(next)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        accentLight,
        accentDark,
        setAccentLight,
        setAccentDark,
        surfaceFamily,
        setSurfaceFamily,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
