'use client'

import { useTheme } from '@/components/ThemeProvider'

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-surface-card text-base shadow-sm transition hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:hover:bg-surface-800"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
