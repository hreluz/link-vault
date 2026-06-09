'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [success, setSuccess] = useState(false)

  const canSubmit = current.length > 0 && next.length >= 8 && confirm === next

  const passwordsMatch = confirm.length === 0 || confirm === next
  const nextTooShort  = next.length > 0 && next.length < 8

  if (success) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <Link
          href="/dashboard/config"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <span aria-hidden="true">←</span> Config
        </Link>

        <div className="mt-8 rounded-2xl bg-emerald-50 p-8 text-center shadow-sm ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-800">
          <div className="mb-3 text-4xl">✅</div>
          <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">Password updated!</p>
          <p className="mt-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            Your password has been changed successfully.
          </p>
          <button
            onClick={() => { setSuccess(false); setCurrent(''); setNext(''); setConfirm('') }}
            className="mt-5 rounded-xl border border-emerald-200 bg-white px-5 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-transparent dark:text-emerald-400 dark:hover:bg-emerald-900/30"
          >
            Change again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      {/* Back link */}
      <Link
        href="/dashboard/config"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <span aria-hidden="true">←</span> Config
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-slate-50">Change Password</h1>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <form
          onSubmit={e => { e.preventDefault(); setSuccess(true) }}
          className="space-y-5"
        >
          {/* Current password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Current password
            </label>
            <input
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* New password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              New password
            </label>
            <input
              type="password"
              value={next}
              onChange={e => setNext(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:ring-2 dark:text-slate-100 dark:placeholder-slate-500 ${
                nextTooShort
                  ? 'border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-500/20 dark:border-amber-600 dark:bg-amber-900/20'
                  : 'border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800'
              }`}
            />
            {nextTooShort && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                Must be at least 8 characters
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
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

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Update password
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        You'll stay logged in after changing your password.
      </p>
    </main>
  )
}
