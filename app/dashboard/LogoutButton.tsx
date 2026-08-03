'use client'

import { useTransition } from 'react'
import { logoutAction } from './actions'
import { useVault } from '@/lib/context/VaultContext'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'

export default function LogoutButton() {
  const [pending, startTransition] = useTransition()
  const { lock } = useVault()
  const { lockAll } = useUnlockedTags()

  function handleLogout() {
    lock()
    lockAll()
    startTransition(() => logoutAction())
  }

  return (
    <button
      onClick={handleLogout}
      disabled={pending}
      className="rounded-xl border border-surface-200 bg-surface-card px-4 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
