'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getPrivateTagSettings, setPrivateTagPassword, verifyPrivateTagPassword } from '@/lib/services/tags'
import { createClient } from '@/lib/supabase/client'
import { useUnlockedTags } from '@/lib/context/UnlockedTagsContext'

export function PrivateTagPasswordSection() {
  const router = useRouter()
  const { unlockedTagIds } = useUnlockedTags()
  const isUnlocked = unlockedTagIds.size > 0
  const [hasPassword, setHasPassword] = useState(false)
  const [currentHint, setCurrentHint] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [hint, setHint] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getPrivateTagSettings().then(s => {
      setHasPassword(s.hasPassword)
      setCurrentHint(s.hint)
      if (!s.hasPassword) setOpen(true)
    })
  }, [])

  function resetForm() {
    setCurrentPassword('')
    setPassword('')
    setConfirm('')
    setHint('')
    setError(null)
  }

  async function signOutAndRedirect(message: string) {
    toast.error(message)
    await createClient().auth.signOut()
    router.push('/login')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) { setError('Password is required.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    setError(null)

    if (hasPassword) {
      const verify = await verifyPrivateTagPassword(currentPassword)
      if (!verify.ok) {
        setLoading(false)
        if (verify.nuked) {
          await signOutAndRedirect('Too many failed attempts. All data has been deleted. You can set a new password after logging in.')
          return
        }
        const left = verify.attemptsLeft
        await signOutAndRedirect(`Incorrect current password — you have been logged out. ${left} attempt${left === 1 ? '' : 's'} remaining.`)
        return
      }
    }

    const result = await setPrivateTagPassword(password, hint)
    setLoading(false)
    if (result !== 'ok') { setError('Something went wrong. Please try again.'); return }
    setHasPassword(true)
    setCurrentHint(hint.trim() || null)
    resetForm()
    setOpen(false)
    toast.success(hasPassword ? 'Password updated.' : 'Private tag password set.')
  }

  return (
    <div className="mb-6 rounded-2xl bg-surface-card shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700">
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${isUnlocked ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary-50 text-primary-600 dark:bg-primary-900/30'}`}>
            {isUnlocked ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M11 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H9V4.5a2 2 0 1 1 4 0 .75.75 0 0 0 1.5 0A3.5 3.5 0 0 0 11 1Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z" clipRule="evenodd" />
              </svg>
            )}
          </span>
          <div>
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              Private tag password
            </p>
            {hasPassword && currentHint && (
              <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                Hint: {currentHint}
              </p>
            )}
            {hasPassword && !currentHint && (
              <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">No hint set</p>
            )}
            {!hasPassword && (
              <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">Not set — private tags won&apos;t be lockable yet</p>
            )}
          </div>
        </div>
        <button
          onClick={() => { setOpen(v => !v); resetForm() }}
          className="rounded-xl border border-surface-200 bg-surface-card px-3 py-1.5 text-xs font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
        >
          {hasPassword ? 'Change' : 'Set password'}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-surface-100 px-5 pb-5 pt-4 dark:border-surface-800">
          <div className="space-y-3">
            {hasPassword && (
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => { setCurrentPassword(e.target.value); setError(null) }}
                  placeholder="Enter current password"
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null) }}
                placeholder="Enter password"
                autoFocus={!hasPassword}
                className="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(null) }}
                placeholder="Repeat password"
                className="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                Hint <span className="font-normal text-surface-400">(optional)</span>
              </label>
              <input
                type="text"
                value={hint}
                onChange={e => setHint(e.target.value)}
                placeholder="A reminder for yourself"
                className="mt-1.5 w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); resetForm() }}
              className="rounded-xl border border-surface-200 bg-surface-card px-4 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim() || !confirm.trim() || (hasPassword && !currentPassword.trim())}
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
