'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTheme } from '@/components/ThemeProvider'
import { useAsyncSelect } from '@/lib/hooks/useAsyncSelect'
import { setAccentColorAction, setSurfaceFamilyAction } from './actions'
import { checkAccentContrast, isPresetAccent, PRESET_ACCENTS } from '@/lib/utils/accentRamp'
import { isSurfaceFamily, SURFACE_FAMILIES } from '@/lib/utils/surfaceFamilies'
import type { AccentColor, SurfaceFamily } from '@/lib/types/database'

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

function ColorFamilyPicker({
  label,
  description,
  value,
  onSelect,
  isPending,
  error,
  presets,
  isPresetValue,
  defaultCustomHex,
  contrastWarning,
}: {
  label: string
  description?: string
  value: string
  onSelect: (value: string) => void
  isPending: boolean
  error: string | null
  presets: { value: string; label: string; swatchClass: string }[]
  isPresetValue: (value: string) => boolean
  defaultCustomHex: string
  contrastWarning?: (hex: string) => boolean
}) {
  const isCustomActive = !isPresetValue(value)
  const [customOpen, setCustomOpen] = useState(isCustomActive)
  const [hex, setHex] = useState(isCustomActive ? value : defaultCustomHex)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setCustomOpen(!isPresetValue(value))
    if (!isPresetValue(value)) setHex(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleHexChange(next: string) {
    setHex(next)
    if (!HEX_PATTERN.test(next)) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSelect(next), 150)
  }

  const showContrastWarning =
    customOpen && HEX_PATTERN.test(hex) && !!contrastWarning && !contrastWarning(hex)

  return (
    <div>
      <p className="font-medium text-surface-900 dark:text-surface-50">{label}</p>
      {description && (
        <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {presets.map(preset => (
          <button
            key={preset.value}
            type="button"
            aria-label={preset.label}
            title={preset.label}
            disabled={isPending}
            onClick={() => {
              setCustomOpen(false)
              onSelect(preset.value)
            }}
            className={`h-8 w-8 rounded-full transition disabled:opacity-50 ${preset.swatchClass} ${
              value === preset.value
                ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-surface-900'
                : 'hover:scale-110'
            }`}
          />
        ))}
        <button
          type="button"
          aria-label="Custom color"
          title="Custom color"
          disabled={isPending}
          onClick={() => setCustomOpen(true)}
          className={`flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-surface-300 text-sm transition disabled:opacity-50 dark:border-surface-600 ${
            customOpen
              ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-surface-900'
              : 'hover:scale-110'
          }`}
        >
          🎨
        </button>
      </div>

      {customOpen && (
        <div className="mt-3 flex items-center gap-3">
          <input
            type="color"
            value={HEX_PATTERN.test(hex) ? hex : defaultCustomHex}
            disabled={isPending}
            onChange={e => handleHexChange(e.target.value)}
            className="h-9 w-9 cursor-pointer rounded-lg border border-surface-200 bg-surface-card p-0.5 dark:border-surface-700 dark:bg-surface-800"
          />
          <input
            type="text"
            value={hex}
            disabled={isPending}
            onChange={e => handleHexChange(e.target.value)}
            placeholder={defaultCustomHex}
            className="w-28 rounded-xl border border-surface-200 bg-surface-card px-3 py-1.5 text-sm text-surface-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
          />
        </div>
      )}

      {showContrastWarning && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          This color may be hard to read as a button background — consider a darker shade.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export default function AppearanceForm({
  initialLight,
  initialDark,
  initialSurface,
}: {
  initialLight: string
  initialDark: string
  initialSurface: SurfaceFamily
}) {
  const { theme, toggleTheme, setAccentLight, setAccentDark, setSurfaceFamily } = useTheme()

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

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link
        href="/dashboard/config"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-surface-500 transition hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
      >
        <span aria-hidden="true">←</span> Config
      </Link>

      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Appearance</h1>
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className="rounded-xl border border-surface-200 bg-surface-card px-4 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100"
        >
          {isResetting ? 'Resetting…' : 'Reset to defaults'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
          <p className="font-medium text-surface-900 dark:text-surface-50">Theme</p>
          <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
            Switch modes to preview how each accent looks.
          </p>
          <div className="mt-4 inline-flex rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
            {(['light', 'dark'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (theme !== mode) toggleTheme()
                }}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  theme === mode
                    ? 'bg-surface-card text-surface-900 shadow-sm dark:bg-surface-700 dark:text-surface-50'
                    : 'text-surface-500 dark:text-surface-400'
                }`}
              >
                {mode === 'light' ? '☀️ Light' : '🌙 Dark'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
          <ColorFamilyPicker
            label="Light mode accent"
            value={light.value}
            onSelect={light.select}
            isPending={light.isPending}
            error={light.error}
            presets={PRESET_ACCENTS}
            isPresetValue={isPresetAccent}
            defaultCustomHex="#6366f1"
            contrastWarning={checkAccentContrast}
          />
        </div>

        <div className="rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
          <ColorFamilyPicker
            label="Dark mode accent"
            value={dark.value}
            onSelect={dark.select}
            isPending={dark.isPending}
            error={dark.error}
            presets={PRESET_ACCENTS}
            isPresetValue={isPresetAccent}
            defaultCustomHex="#6366f1"
            contrastWarning={checkAccentContrast}
          />
        </div>

        <div className="rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
          <ColorFamilyPicker
            label="Surface tone"
            description="The neutral tone used for the header, cards, and borders."
            value={surface.value}
            onSelect={surface.select}
            isPending={surface.isPending}
            error={surface.error}
            presets={SURFACE_FAMILIES}
            isPresetValue={isSurfaceFamily}
            defaultCustomHex="#71717a"
          />
        </div>
      </div>
    </main>
  )
}
