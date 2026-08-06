'use client'

import { useTheme } from '@/components/ThemeProvider'
import { useToast } from '@/components/ToastProvider'
import { setThemeModeAction } from '@/app/dashboard/config/appearance/actions'

export default function ThemeToggleButton() {
  const { theme, themeMode, setThemeMode } = useTheme()
  const { addToast } = useToast()
  const isDark = theme === 'dark'

  async function handleToggle() {
    const previousMode = themeMode
    const next = theme === 'dark' ? 'light' : 'dark'
    setThemeMode(next)
    const result = await setThemeModeAction(next)
    if (!result.success) {
      setThemeMode(previousMode)
      addToast('Failed to update theme', 'destructive')
    }
  }

  return (
    <button
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-surface-card text-base shadow-sm transition hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:hover:bg-surface-800"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
