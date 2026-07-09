'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signupAction } from './actions'

export default function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const passwordsMatch = confirmPassword.length === 0 || confirmPassword === password

  if (state?.success) {
    return (
      <div className="text-center space-y-3">
        <div className="text-3xl">📬</div>
        <p className="font-medium text-slate-900 dark:text-slate-50">Check your email</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          We sent you a confirmation link to finish creating your account.
        </p>
        <Link
          href="/login"
          className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

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
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Confirm password
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
          className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 dark:text-slate-100 dark:placeholder-slate-500 ${
            !passwordsMatch
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700 dark:bg-red-900/20'
              : 'border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800'
          }`}
        />
        {!passwordsMatch && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
        )}
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || (confirmPassword.length > 0 && !passwordsMatch)}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
          Sign in
        </Link>
      </p>
    </form>
  )
}
