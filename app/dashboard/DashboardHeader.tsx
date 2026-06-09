import LogoutButton from './LogoutButton'
import ThemeToggleButton from './ThemeToggleButton'

export default function DashboardHeader({ userEmail }: { userEmail: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🔖</span>
          <span className="font-semibold text-slate-900 dark:text-slate-50">Link Vault</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">{userEmail}</span>
          <ThemeToggleButton />
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
