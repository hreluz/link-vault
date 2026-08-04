'use client'

import { useEffect, useRef, useState } from 'react'

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export default function ColorFamilyPicker({
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
