'use client'

import Link from 'next/link'
import { toggleRegistrationAction, toggleRestartAccountAction } from './actions'
import { useAsyncToggle } from '@/lib/hooks/useAsyncToggle'

export default function AdminSettingsForm({
  initialRegistrationEnabled,
  initialRestartAccountEnabled,
}: {
  initialRegistrationEnabled: boolean
  initialRestartAccountEnabled: boolean
}) {
  const {
    enabled,
    error,
    isPending,
    toggle: handleToggle,
  } = useAsyncToggle(initialRegistrationEnabled, toggleRegistrationAction)

  const {
    enabled: restartAccountEnabled,
    error: restartAccountError,
    isPending: isRestartAccountPending,
    toggle: handleRestartAccountToggle,
  } = useAsyncToggle(initialRestartAccountEnabled, toggleRestartAccountAction)

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link
        href="/dashboard/config"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <span aria-hidden="true">←</span> Config
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-slate-900 dark:text-slate-50">Admin Settings</h1>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        {error && (
          <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-50">New user registration</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {enabled ? 'Sign up is currently enabled.' : 'Sign up is currently disabled.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={isPending}
            onClick={handleToggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
              enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                enabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        {restartAccountError && (
          <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {restartAccountError}
          </p>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-50">Account restart</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {restartAccountEnabled
                ? 'Account restart is currently enabled.'
                : 'Account restart is currently disabled.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={restartAccountEnabled}
            disabled={isRestartAccountPending}
            onClick={handleRestartAccountToggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
              restartAccountEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                restartAccountEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>
    </main>
  )
}
