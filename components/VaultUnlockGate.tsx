'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useVault } from '@/lib/context/VaultContext'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'
import { createClient } from '@/lib/supabase/client'

export default function VaultUnlockGate({ children }: { children: React.ReactNode }) {
  const { isUnlocked, unlock } = useVault()
  const { lockAll } = useUnlockedTags()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isUnlocked) return <>{children}</>

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError(null)
    const { status } = await unlock(password)
    setLoading(false)

    if (status === 'wrong_password') {
      setError('Incorrect password.')
    } else if (status === 'error') {
      setError('Something went wrong. Please try again.')
    }
  }

  async function handleSignOut() {
    lockAll()
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50">Unlock your vault</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter your password to decrypt your links for this session.
            </p>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null) }}
            placeholder="Password"
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Unlocking…' : 'Unlock'}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
