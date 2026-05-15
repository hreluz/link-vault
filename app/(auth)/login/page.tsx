import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign in — Link Vault',
}

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-6 text-lg font-semibold text-slate-900">Sign in</h2>
      <LoginForm />
    </>
  )
}
