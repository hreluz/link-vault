import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Organize — Link Vault' }

const SECTIONS = [
  {
    href: '/dashboard/organize/categories',
    icon: '📂',
    title: 'Categories',
    description: 'Organize your links into custom categories',
  },
  {
    href: '/dashboard/organize/tags',
    icon: '🏷️',
    title: 'Tags',
    description: 'Create and manage tags for your links',
  },
]

export default function OrganizePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Organize</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Manage your categories and tags
        </p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map(({ href, icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-700 dark:hover:ring-slate-600"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-800">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 dark:text-slate-50">{title}</p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
            <span className="text-lg text-slate-300 dark:text-slate-600" aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </main>
  )
}
