'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useScrollToTop } from '@/lib/hooks/shared/useScrollToTop'
import { useDashboardHeaderSlot } from '@/lib/context/DashboardHeaderSlotContext'
import LogoutButton from './LogoutButton'
import ThemeToggleButton from './ThemeToggleButton'

export default function DashboardHeader({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const scrollToTop = useScrollToTop()
  const { setSlot } = useDashboardHeaderSlot()
  const logo = (
    <>
      <span className="text-xl" aria-hidden="true">🔖</span>
      <span className="font-semibold text-surface-900 dark:text-surface-50">Link Vault</span>
    </>
  )

  return (
    <header data-sticky-chrome="" className="sticky top-0 z-40 border-b border-surface-200 bg-surface-card dark:border-surface-700 dark:bg-surface-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 xl:max-w-6xl 2xl:max-w-7xl">
        {pathname === '/dashboard' ? (
          // Already on the links page: just scroll to top directly, without
          // going through Link/router navigation to the same URL -- that
          // still runs Next's own post-navigation scroll/focus handling,
          // which was fighting our scroll-to-top animation.
          <button type="button" onClick={scrollToTop} aria-label="Link Vault, scroll to top" className="focus-ring flex min-h-11 items-center gap-2 rounded-lg">
            {logo}
          </button>
        ) : (
          <Link href="/dashboard" className="focus-ring flex min-h-11 items-center gap-2 rounded-lg">
            {logo}
          </Link>
        )}
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-surface-500 dark:text-surface-400 sm:block">{userEmail}</span>
          {/* Page-provided controls (the link list's Undo, SPEC 36) portal in here. */}
          <div ref={setSlot} data-testid="dashboard-header-slot" className="contents" />
          <ThemeToggleButton />
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
