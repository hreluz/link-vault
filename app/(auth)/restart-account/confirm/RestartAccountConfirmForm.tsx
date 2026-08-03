'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRestartAccount } from '@/lib/hooks/auth/useRestartAccount'

const CONFIRM_WORD = 'DELETE'

export default function RestartAccountConfirmForm() {
  const router = useRouter()
  const { mutate, isPending, error } = useRestartAccount()
  const [checkingSession, setCheckingSession] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [deleteWord, setDeleteWord] = useState('')

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user) {
        router.replace('/restart-account')
        return
      }
      setCheckingSession(false)
    })
    return () => { cancelled = true }
  }, [router])

  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password
  const canSubmit =
    !isPending &&
    password.length > 0 &&
    confirmPassword === password &&
    acknowledged &&
    deleteWord === CONFIRM_WORD

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate(password)
  }

  if (checkingSession) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        Setting a new password will permanently delete all your saved links, categories, and tags. This cannot be
        undone.
      </p>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-300">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-700 dark:text-surface-300">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className={`w-full rounded-xl border px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:ring-2 dark:text-surface-100 dark:placeholder-surface-500 ${
            !passwordsMatch
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700 dark:bg-red-900/20'
              : 'border-surface-200 bg-surface-card focus:border-primary-500 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800'
          }`}
        />
        {!passwordsMatch && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
        )}
      </div>

      <div className="border-t border-surface-100 dark:border-surface-800" />

      <label className="flex items-start gap-2.5 text-sm text-surface-700 dark:text-surface-300">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={e => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500/40 dark:border-surface-600 dark:bg-surface-800"
        />
        I understand this will permanently delete all my saved links, categories, and tags.
      </label>

      <div className="space-y-1">
        <label htmlFor="deleteWord" className="block text-sm font-medium text-surface-700 dark:text-surface-300">
          Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
        </label>
        <input
          id="deleteWord"
          name="deleteWord"
          type="text"
          autoComplete="off"
          placeholder={CONFIRM_WORD}
          value={deleteWord}
          onChange={e => setDeleteWord(e.target.value)}
          className="w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Restarting account…' : 'Permanently delete data & set new password'}
      </button>
    </form>
  )
}
