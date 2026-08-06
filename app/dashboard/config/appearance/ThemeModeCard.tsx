'use client'

import type { ThemeMode } from '@/lib/types/database'

const OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '🖥️' },
]

export default function ThemeModeCard({
  value,
  onSelect,
  isPending,
  error,
}: {
  value: ThemeMode
  onSelect: (mode: ThemeMode) => void
  isPending: boolean
  error: string | null
}) {
  return (
    <div className="rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
      <p className="font-medium text-surface-900 dark:text-surface-50">Theme</p>
      <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">
        Choose Light or Dark, or follow your device&apos;s setting automatically.
      </p>
      <div className="mt-4 inline-flex rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
        {OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            disabled={isPending}
            onClick={() => onSelect(option.value)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
              value === option.value
                ? 'bg-surface-card text-surface-900 shadow-sm dark:bg-surface-700 dark:text-surface-50'
                : 'text-surface-500 dark:text-surface-400'
            }`}
          >
            {option.icon} {option.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
