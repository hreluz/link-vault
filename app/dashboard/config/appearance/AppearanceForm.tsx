'use client'

import Link from 'next/link'
import { checkAccentContrast, isPresetAccent, PRESET_ACCENTS } from '@/lib/utils/accentRamp'
import { isSurfaceFamily, SURFACE_FAMILIES } from '@/lib/utils/surfaceFamilies'
import { useAppearanceSettings } from '@/lib/hooks/appearance/useAppearanceSettings'
import type { SurfaceFamily, ThemeMode } from '@/lib/types/database'
import ColorFamilyPicker from './ColorFamilyPicker'
import ThemeModeCard from './ThemeModeCard'

export default function AppearanceForm({
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
  const { light, dark, surface, mode, isResetting, handleReset } = useAppearanceSettings({
    initialLight,
    initialDark,
    initialSurface,
    initialMode,
  })

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
        <ThemeModeCard value={mode.value} onSelect={mode.select} isPending={mode.isPending} error={mode.error} />

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
