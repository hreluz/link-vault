import type { Metadata } from 'next'
import SignupForm from './SignupForm'

export const metadata: Metadata = {
  title: 'Create account — Link Vault',
}

export default function SignupPage() {
  return (
    <>
      <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">Create account</h2>
      <SignupForm />
    </>
  )
}
