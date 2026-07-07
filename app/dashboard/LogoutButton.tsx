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
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
