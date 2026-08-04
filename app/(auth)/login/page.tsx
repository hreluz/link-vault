import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign in — Link Vault',
}

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-6 text-lg font-semibold text-surface-900 dark:text-surface-50">Sign in</h2>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  )
}
