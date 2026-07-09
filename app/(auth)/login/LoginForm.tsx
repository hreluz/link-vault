'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginAction } from './actions'
import { useVault } from '@/lib/context/VaultContext'
import { buildCaptureResumeUrl } from '@/lib/bookmarklet'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { unlock } = useVault()
  const [state, action, pending] = useActionState(loginAction, null)
  const [password, setPassword] = useState('')
  const [vaultError, setVaultError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const confirmError = searchParams.get('confirmError')
  const capturedUrl = searchParams.get('capturedUrl')
  const capturedTitle = searchParams.get('capturedTitle')

  useEffect(() => {
    if (!state?.success) return

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnlocking(true)

    async function bootstrapVault() {
      const { status, dek } = await unlock(password)
      if (cancelled) return

      if (status === 'wrong_password' || status === 'error' || !dek) {
        setVaultError('Could not unlock your vault. Please try again.')
        setUnlocking(false)
        return
      }

      router.push(buildCaptureResumeUrl(capturedUrl, capturedTitle))
    }

    bootstrapVault()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success])

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
      </div>

      {(state?.error || vaultError || confirmError) && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {state?.error ?? vaultError ?? 'That confirmation link is invalid or expired. Please sign up again.'}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || unlocking}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Signing in…' : unlocking ? 'Unlocking vault…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        No account?{' '}
        <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
          Create one
        </Link>
      </p>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/restart-account" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
          Restart account
        </Link>
      </p>
    </form>
  )
}
