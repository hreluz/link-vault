'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useScrollToTop } from '@/lib/hooks/shared/useScrollToTop'

const NAV_ITEMS = [
  { label: 'Links',    icon: '🔖', href: '/dashboard' },
  { label: 'Organize', icon: '🗂️', href: '/dashboard/organize' },
  { label: 'Config',   icon: '⚙️', href: '/dashboard/config' },
]

export default function DashboardNav() {
  const pathname = usePathname()
  const scrollToTop = useScrollToTop()

  return (
    <>
      {/* Mobile: fixed bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-200 bg-surface-card dark:border-surface-700 dark:bg-surface-900 sm:hidden">
        <div className="flex">
          {NAV_ITEMS.map(({ label, icon, href }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            const className = `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition ${
              active
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300'
            }`
            const content = (
              <>
                <span className="text-xl" aria-hidden="true">{icon}</span>
                {label}
              </>
            )
            // Already on this route: scroll to top directly instead of
            // going through Link/router navigation to the same URL -- that
            // still runs Next's own post-navigation scroll/focus handling,
            // which was fighting our scroll-to-top animation.
            if (href === '/dashboard' && pathname === '/dashboard') {
              return (
                <button key={href} type="button" onClick={scrollToTop} className={className}>
                  {content}
                </button>
              )
            }
            return (
              <Link key={href} href={href} className={className}>
                {content}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop: underline tab bar below header */}
      <nav className="hidden border-b border-surface-200 bg-surface-card dark:border-surface-700 dark:bg-surface-900 sm:block">
        <div className="mx-auto flex max-w-5xl gap-1 px-4">
          {NAV_ITEMS.map(({ label, icon, href }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            const className = `flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
              active
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
            }`
            const content = (
              <>
                <span aria-hidden="true">{icon}</span>
                {label}
              </>
            )
            if (href === '/dashboard' && pathname === '/dashboard') {
              return (
                <button key={href} type="button" onClick={scrollToTop} className={className}>
                  {content}
                </button>
              )
            }
            return (
              <Link key={href} href={href} className={className}>
                {content}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
