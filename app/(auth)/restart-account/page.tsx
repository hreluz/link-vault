import type { Metadata } from 'next'
import { Suspense } from 'react'
import RestartAccountForm from './RestartAccountForm'
import { createClient } from '@/lib/supabase/server'
import { isRestartAccountEnabled } from '@/lib/services/appSettings'

export const metadata: Metadata = {
  title: 'Restart account — Link Vault',
}

export default async function RestartAccountPage() {
  const supabase = await createClient()
  const enabled = await isRestartAccountEnabled(supabase)

  return (
    <>
      <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">Restart account</h2>
      {enabled ? (
        <Suspense>
          <RestartAccountForm />
        </Suspense>
      ) : (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Account restart is currently disabled.
        </p>
      )}
    </>
  )
}
