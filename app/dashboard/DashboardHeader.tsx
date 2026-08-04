'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useScrollToTop } from '@/lib/hooks/useScrollToTop'
import LogoutButton from './LogoutButton'
import ThemeToggleButton from './ThemeToggleButton'

export default function DashboardHeader({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const scrollToTop = useScrollToTop()
  const logo = (
    <>
      <span className="text-xl" aria-hidden="true">🔖</span>
      <span className="font-semibold text-surface-900 dark:text-surface-50">Link Vault</span>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-surface-200 bg-surface-card dark:border-surface-700 dark:bg-surface-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {pathname === '/dashboard' ? (
          // Already on the links page: just scroll to top directly, without
          // going through Link/router navigation to the same URL -- that
          // still runs Next's own post-navigation scroll/focus handling,
          // which was fighting our scroll-to-top animation.
          <button type="button" onClick={scrollToTop} className="flex items-center gap-2">
            {logo}
          </button>
        ) : (
          <Link href="/dashboard" className="flex items-center gap-2">
            {logo}
          </Link>
        )}
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-surface-500 dark:text-surface-400 sm:block">{userEmail}</span>
          <ThemeToggleButton />
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
