'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Links',      icon: '🔖', href: '/dashboard' },
  { label: 'Favorites',  icon: '⭐', href: '/dashboard/favorites' },
  { label: 'Tags',       icon: '🏷️',  href: '/dashboard/tags' },
  { label: 'Categories', icon: '📂', href: '/dashboard/categories' },
]

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile: fixed bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white sm:hidden">
        <div className="flex">
          {NAV_ITEMS.map(({ label, icon, href }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition ${
                  active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="text-xl" aria-hidden="true">{icon}</span>
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop: underline tab bar below header */}
      <nav className="hidden border-b border-slate-200 bg-white sm:block">
        <div className="mx-auto flex max-w-5xl gap-1 px-4">
          {NAV_ITEMS.map(({ label, icon, href }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  active
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
