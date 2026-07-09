import type { Metadata } from 'next'
import { Suspense } from 'react'
import RestartAccountForm from './RestartAccountForm'

export const metadata: Metadata = {
  title: 'Restart account — Link Vault',
}

export default function RestartAccountPage() {
  return (
    <>
      <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">Restart account</h2>
      <Suspense>
        <RestartAccountForm />
      </Suspense>
    </>
  )
}
