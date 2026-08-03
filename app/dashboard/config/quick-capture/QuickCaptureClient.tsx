'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { buildBookmarkletHref } from '@/lib/bookmarklet'

export default function QuickCaptureClient() {
  const [href, setHref] = useState<string | null>(null)
  const anchorRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHref(buildBookmarkletHref(window.location.origin))
  }, [])

  useEffect(() => {
    // React 19 blocks javascript: URLs assigned via the `href` prop as an XSS
    // precaution. Setting it imperatively via the DOM API bypasses that, since
    // the sanitizer only runs on attributes React itself commits.
    if (href) anchorRef.current?.setAttribute('href', href)
  }, [href])

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link
        href="/dashboard/config"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-surface-500 transition hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
      >
        <span aria-hidden="true">←</span> Config
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-surface-900 dark:text-surface-50">Quick Capture</h1>
      <p className="mb-8 text-sm text-surface-500 dark:text-surface-400">
        Save the page you&apos;re on to Link Vault in one click, from any site.
      </p>

      <div className="rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
        <p className="mb-4 text-sm font-medium text-surface-700 dark:text-surface-300">
          Drag this button to your bookmarks bar:
        </p>
        {href && (
          <a
            ref={anchorRef}
            onClick={e => e.preventDefault()}
            className="inline-flex cursor-grab items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 active:cursor-grabbing"
          >
            🔖 Save to Link Vault
          </a>
        )}
        <p className="mt-4 text-xs text-surface-500 dark:text-surface-400">
          Make sure your browser&apos;s bookmarks bar is visible, then drag the button above onto it.
          Whenever you&apos;re on a page you want to save, click the bookmark — it opens Link Vault
          in a new tab with that page&apos;s URL and title pre-filled.
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-surface-card p-6 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
        <p className="mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">On iOS Safari</p>
        <p className="text-xs text-surface-500 dark:text-surface-400">
          Safari on iPhone/iPad doesn&apos;t allow dragging this kind of link into bookmarks. Instead:
          bookmark this page first (Share → Add Bookmark), then edit that bookmark and replace its
          URL with the code below.
        </p>
        {href && (
          <textarea
            readOnly
            value={href}
            onFocus={e => e.currentTarget.select()}
            rows={4}
            className="mt-3 w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 font-mono text-xs text-surface-600 outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
          />
        )}
      </div>
    </main>
  )
}
