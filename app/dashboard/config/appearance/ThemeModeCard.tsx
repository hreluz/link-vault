'use client'

import { useTheme } from '@/components/ThemeProvider'

export default function ThemeModeCard() {
  const { theme, toggleTheme } = useTheme()

  return (
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
  )
}
