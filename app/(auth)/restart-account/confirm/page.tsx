import type { Metadata } from 'next'
import RestartAccountConfirmForm from './RestartAccountConfirmForm'

export const metadata: Metadata = {
  title: 'Set new password — Link Vault',
}

export default function RestartAccountConfirmPage() {
  return (
    <>
      <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">Set a new password</h2>
      <RestartAccountConfirmForm />
    </>
  )
}
