import type { Metadata } from 'next'
import ChangePasswordForm from './ChangePasswordForm'

export const metadata: Metadata = { title: 'Change Password — Link Vault' }

export default function ChangePasswordPage() {
  return <ChangePasswordForm />
}
