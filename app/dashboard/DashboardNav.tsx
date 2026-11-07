'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useScrollToTop } from '@/lib/hooks/shared/useScrollToTop'
import { FolderIcon, GearIcon, LinkIcon } from '@/components/icons'

// Icons follow the item's text colour, so the active one takes the accent (SPEC 38).
const NAV_ITEMS = [
  { label: 'Links',    Icon: LinkIcon,   href: '/dashboard' },
  { label: 'Organize', Icon: FolderIcon, href: '/dashboard/organize' },
  { label: 'Config',   Icon: GearIcon,   href: '/dashboard/config' },
]

export default function DashboardNav() {
  const pathname = usePathname()
  const scrollToTop = useScrollToTop()

  return (
    <>
      {/* Mobile: fixed bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-200 bg-surface-card pb-[env(safe-area-inset-bottom)] dark:border-surface-700 dark:bg-surface-900 sm:hidden">
        <div className="flex">
          {NAV_ITEMS.map(({ label, Icon, href }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            const className = `focus-ring flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition ${
              active
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300'
            }`
            const content = (
              <>
                <Icon className="h-6 w-6" />
                {label}
              </>
            )
            // Already on this route: scroll to top directly instead of
            // going through Link/router navigation to the same URL -- that
            // still runs Next's own post-navigation scroll/focus handling,
            // which was fighting our scroll-to-top animation.
            if (href === '/dashboard' && pathname === '/dashboard') {
              return (
                <button key={href} type="button" onClick={scrollToTop} aria-current={active ? 'page' : undefined} className={className}>
                  {content}
                </button>
              )
            }
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={className}>
                {content}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop: underline tab bar, sticky right under the sticky header (SPEC 38).
          top-[69px] is the header's height: its 44px logo row + py-3 + 1px border. */}
      <nav
        data-sticky-chrome=""
        className="sticky top-[69px] z-30 hidden border-b border-surface-200 bg-surface-card dark:border-surface-700 dark:bg-surface-900 sm:block"
      >
        <div className="mx-auto flex max-w-5xl gap-1 px-4 xl:max-w-6xl 2xl:max-w-7xl">
          {NAV_ITEMS.map(({ label, Icon, href }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            const className = `focus-ring flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
              active
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
            }`
            const content = (
              <>
                <Icon className="h-5 w-5" />
                {label}
              </>
            )
            if (href === '/dashboard' && pathname === '/dashboard') {
              return (
                <button key={href} type="button" onClick={scrollToTop} aria-current={active ? 'page' : undefined} className={className}>
                  {content}
                </button>
              )
            }
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={className}>
                {content}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
