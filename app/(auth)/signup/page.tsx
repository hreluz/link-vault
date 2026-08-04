import type { Metadata } from 'next'
import SignupForm from './SignupForm'
import { createClient } from '@/lib/supabase/server'
import { isRegistrationEnabled } from '@/lib/services/appSettings'

export const metadata: Metadata = {
  title: 'Create account — Link Vault',
}

export default async function SignupPage() {
  const supabase = await createClient()
  const enabled = await isRegistrationEnabled(supabase)

  return (
    <>
      <h2 className="mb-6 text-lg font-semibold text-surface-900 dark:text-surface-50">Create account</h2>
      {enabled ? (
        <SignupForm />
      ) : (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          New account registration is currently disabled.
        </p>
      )}
    </>
  )
}
