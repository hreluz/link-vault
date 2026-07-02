import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRole } from '@/lib/services/users'
import { isRegistrationEnabled } from '@/lib/services/appSettings'
import AdminSettingsForm from './AdminSettingsForm'

export const metadata: Metadata = { title: 'Admin Settings — Link Vault' }

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const role = await getCurrentUserRole(supabase)
  if (role !== 'admin') redirect('/dashboard/config')

  const enabled = await isRegistrationEnabled(supabase)

  return <AdminSettingsForm initialEnabled={enabled} />
}
