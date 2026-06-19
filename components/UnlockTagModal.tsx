'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { verifyPrivateTagPassword, getPrivateTagSettings } from '@/lib/services/tags'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onUnlock: () => void
  onClose: () => void
}

export default function UnlockTagModal({ onUnlock, onClose }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getPrivateTagSettings().then(s => setHint(s.hint))
  }, [])

  async function signOutAndRedirect(message: string) {
    toast.error(message)
    await createClient().auth.signOut()
    router.push('/login')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError(null)
    const result = await verifyPrivateTagPassword(password)
    setLoading(false)

    if (result.ok) {
      onUnlock()
      onClose()
      return
    }

    if (result.nuked) {
      await signOutAndRedirect('Too many failed attempts. All data has been deleted. You can set a new password after logging in.')
      return
    }

    const left = result.attemptsLeft
    await signOutAndRedirect(`Incorrect password — you have been logged out. ${left} attempt${left === 1 ? '' : 's'} remaining.`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-t-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:rounded-2xl dark:bg-slate-900 dark:ring-slate-700">
        <div className="flex justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z" clipRule="evenodd" />
              </svg>
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Unlock private tags
            </h2>
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Enter the password to reveal all private tag links for this session.
          </p>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null) }}
            placeholder="Password"
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
          {hint && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Hint: {hint}
            </p>
          )}
          {error && (
            <p className="mt-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Checking…' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
