'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { restartAccountAction } from './actions'

export default function RestartAccountForm() {
  const searchParams = useSearchParams()
  const confirmError = searchParams.get('confirmError')
  const [state, action, pending] = useActionState(restartAccountAction, null)

  if (state?.success) {
    return (
      <div className="text-center space-y-3">
        <div className="text-3xl">📬</div>
        <p className="font-medium text-surface-900 dark:text-surface-50">Check your email</p>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          If an account exists for that email, we&apos;ve sent a link to restart it.
        </p>
        <Link
          href="/login"
          className="mt-2 inline-block text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
        This will help you get back in — but note it creates a fresh, empty vault. Your existing links, tags, and
        categories cannot be recovered.
      </p>

      {confirmError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          That restart link is invalid or expired. Please request a new one below.
        </p>
      )}

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-surface-700 dark:text-surface-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border border-surface-200 bg-surface-card px-4 py-3 text-sm text-surface-900 placeholder-surface-400 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send restart link'}
      </button>

      <p className="text-center text-sm text-surface-500 dark:text-surface-400">
        Remembered your password?{' '}
        <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
          Sign in
        </Link>
      </p>
    </form>
  )
}
